import { spawn } from 'child_process'
import { mkdir, rm } from 'fs/promises'
import { join, sep } from 'path'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import type { MediaInfo } from '@shared/types'
import type { MediaTools, ToWavOptions } from '../../application/ports/mediaTools'
import {
  conversionErrorCode,
  createProgressParser,
  MediaError,
  parseProbeOutput,
  wavArgs
} from '../../domain/media'
import { lastLines } from '../../domain/text'

/**
 * ffprobe y ffmpeg como procesos hijos. No importa `electron` para poder probarlo con los
 * binarios reales: la carpeta temporal la decide quien llama.
 */

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

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
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

/** Adaptador del puerto `MediaTools` sobre ffprobe y ffmpeg. */
export const ffmpegMediaTools: MediaTools = { probe, toWav }
