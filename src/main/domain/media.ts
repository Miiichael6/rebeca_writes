import { isChromiumPlayable } from '@shared/formats'
import type { AudioTrack, ErrorCode, MediaInfo } from '@shared/types'

/** Lógica pura de medios (spec §2.3 pasos 1–2): interpretar ffprobe y armar los argumentos de ffmpeg. */

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
