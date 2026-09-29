import { spawn } from 'child_process'
import { mkdir, rm } from 'fs/promises'
import { join, sep } from 'path'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { isChromiumPlayable } from '@shared/formats'
import type { AudioTrack, ErrorCode, MediaInfo } from '@shared/types'

/**
 * Probe y conversión a WAV (spec §2.3 pasos 1–2). No importa `electron` para poder
 * probarlo con los binarios reales: la carpeta temporal la decide quien llama.
 */

/** Error de medios con código traducible. `detail` (stderr de ffmpeg) solo va al log. */
export class MediaError extends Error {
  constructor(
    readonly code: Extract<
      ErrorCode,
      'noAudioStream' | 'unreadableMedia' | 'conversionFailed' | 'noDiskSpace'
    >,
    readonly detail = ''
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'MediaError'
  }
}

/**
 * Los paquetes `*-static` devuelven rutas dentro de `app.asar`, donde no se puede
 * ejecutar nada; en producción están en `app.asar.unpacked` (`asarUnpack`).
 */
export function unpackedPath(path: string): string {
  return path.replace(`app.asar${sep}`, `app.asar.unpacked${sep}`)
}

export function ffmpegPath(): string {
  if (!ffmpegStatic) throw new Error('ffmpeg-static no tiene binario para esta plataforma')
  return unpackedPath(ffmpegStatic)
}

export function ffprobePath(): string {
  return unpackedPath(ffprobeStatic.path)
}

// ── probe ────────────────────────────────────────────────────────────────────

interface ProbeStream {
  codec_type?: string
  codec_name?: string
  channels?: number
  duration?: string
  disposition?: { attached_pic?: number }
  tags?: { language?: string; title?: string }
}

interface ProbeOutput {
  streams?: ProbeStream[]
  format?: { format_name?: string; duration?: string }
}

function seconds(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Interpreta el JSON de `ffprobe -show_format -show_streams -of json`. */
export function parseProbeOutput(json: string): MediaInfo {
  let data: ProbeOutput
  try {
    data = JSON.parse(json) as ProbeOutput
  } catch {
    throw new MediaError('unreadableMedia', 'salida de ffprobe no es JSON')
  }
  const streams = data.streams ?? []
  const container = data.format?.format_name ?? ''
  if (!container) throw new MediaError('unreadableMedia', 'ffprobe no reconoció el contenedor')

  // Las carátulas (mjpeg/png en mp3, m4a, mka) son streams de video con attached_pic.
  const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
  const audioTracks: AudioTrack[] = streams
    .filter((s) => s.codec_type === 'audio')
    .map((s, index) => {
      const language = s.tags?.language
      return {
        index,
        ...(language && language !== 'und' ? { language } : {}),
        ...(s.tags?.title ? { title: s.tags.title } : {}),
        codec: s.codec_name ?? 'unknown',
        channels: s.channels ?? 0
      }
    })

  // Algunos contenedores (mkv sin cues, ts) no traen duración global; se usa la del stream más largo.
  const durationSec =
    seconds(data.format?.duration) || Math.max(0, ...streams.map((s) => seconds(s.duration)))
  const videoCodec = video?.codec_name ?? null

  return {
    durationSec,
    container,
    videoCodec,
    audioTracks,
    isChromiumPlayable: isChromiumPlayable(container, videoCodec, audioTracks[0]?.codec ?? null)
  }
}

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

function lastLines(text: string, count = 5): string {
  return text.trim().split(/\r?\n/).slice(-count).join(' | ')
}

/**
 * Analiza el archivo con ffprobe. Falla con `unreadableMedia` si ffprobe no lo entiende
 * y con `noAudioStream` si no tiene ninguna pista de audio.
 */
export async function probe(file: string): Promise<MediaInfo> {
  const args = ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]
  const { code, stdout, stderr } = await new Promise<RunResult>((resolve, reject) => {
    const child = spawn(ffprobePath(), args, { windowsHide: true })
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString('utf8')))
    child.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')))
    child.on('error', reject)
    child.on('close', (exit) => resolve({ code: exit, stdout: out, stderr: err }))
  })
  if (code !== 0) throw new MediaError('unreadableMedia', lastLines(stderr))

  const info = parseProbeOutput(stdout)
  if (info.audioTracks.length === 0) throw new MediaError('noAudioStream')
  return info
}

// ── toWav ────────────────────────────────────────────────────────────────────

/**
 * Lee la salida de `-progress pipe:1` (bloques `clave=valor` terminados en `progress=`)
 * y llama a `onProgress` con 0–100. `out_time_ms` está en microsegundos pese al nombre.
 */
export function createProgressParser(
  durationSec: number,
  onProgress: (percent: number) => void
): (chunk: string) => void {
  let pending = ''
  let last = -1
  return (chunk) => {
    pending += chunk
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''
    for (const line of lines) {
      const [key, value] = line.split('=', 2)
      let percent: number | null = null
      if (key === 'progress' && value === 'end') percent = 100
      else if ((key === 'out_time_us' || key === 'out_time_ms') && durationSec > 0) {
        const us = Number(value)
        if (Number.isFinite(us) && us >= 0) {
          percent = Math.min(100, Math.floor(us / 1e4 / durationSec))
        }
      }
      if (percent !== null && percent > last) {
        last = percent
        onProgress(percent)
      }
    }
  }
}

export interface ToWavOptions {
  /** Carpeta del trabajo; se crea si no existe y se borra entera si falla o se cancela. */
  outDir: string
  /** Posición entre las pistas de audio (`AudioTrack.index`). Por defecto la primera. */
  track?: number
  /** Filtro `loudnorm` (Configuración › Normalización de audio). */
  normalize?: boolean
  /** Duración de `probe`, para calcular el porcentaje. */
  durationSec?: number
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/** Argumentos de ffmpeg para el WAV que necesita whisper: PCM s16le, 16 kHz, mono. */
export function wavArgs(file: string, out: string, track = 0, normalize = false): string[] {
  return [
    '-hide_banner', '-nostdin', '-nostats', '-loglevel', 'error', '-y',
    '-i', file,
    '-map', `0:a:${track}`, '-vn', '-sn', '-dn',
    ...(normalize ? ['-af', 'loudnorm'] : []),
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
    '-progress', 'pipe:1',
    out
  ] // prettier-ignore
}

/**
 * Código de error de una conversión fallida. Con el disco lleno ffmpeg no devuelve
 * ENOSPC a Node: solo lo escribe en stderr ("No space left on device").
 */
export function conversionErrorCode(stderr: string): 'noDiskSpace' | 'conversionFailed' {
  return /no space left on device/i.test(stderr) ? 'noDiskSpace' : 'conversionFailed'
}

/**
 * Convierte la pista elegida a `<outDir>/audio.wav` y devuelve su ruta. Al cancelar
 * con `signal` mata ffmpeg, borra `outDir` y rechaza con el `AbortError`.
 */
export async function toWav(file: string, options: ToWavOptions): Promise<string> {
  const { outDir, track = 0, normalize = false, durationSec = 0, onProgress, signal } = options
  signal?.throwIfAborted()
  await mkdir(outDir, { recursive: true })
  const out = join(outDir, 'audio.wav')

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(ffmpegPath(), wavArgs(file, out, track, normalize), {
        windowsHide: true
      })
      const onAbort = (): void => {
        child.kill()
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      const parse = onProgress ? createProgressParser(durationSec, onProgress) : null
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => parse?.(d.toString('utf8')))
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
      child.on('error', (err) => {
        signal?.removeEventListener('abort', onAbort)
        reject(err)
      })
      // Se espera a `close` para que Windows haya soltado el WAV antes de borrarlo.
      child.on('close', (code) => {
        signal?.removeEventListener('abort', onAbort)
        if (signal?.aborted) reject(signal.reason)
        else if (code === 0) resolve()
        else reject(new MediaError(conversionErrorCode(stderr), lastLines(stderr)))
      })
    })
  } catch (err) {
    await rm(outDir, { recursive: true, force: true })
    throw err
  }
  return out
}
