import { createHash } from 'crypto'
import { normalize, sep } from 'path'
import { PLAYABLE_AUDIO_CODECS, PLAYABLE_CONTAINERS } from '@shared/formats'
import type { MediaInfo } from '@shared/types'

/** Vistas previas (tarea 11): qué hay que generar, con qué argumentos de ffmpeg y qué desalojar de la caché. */

/** Cómo se consigue el audio mientras se genera la vista previa de un video. */
export type AudioSource = 'original' | 'copy' | 'encode'

export interface PreviewPlan {
  /** `true`: solo hace falta audio (el archivo no tiene video). */
  audioOnly: boolean
  /**
   * `original`: Chromium lee el contenedor y el audio (p. ej. HEVC en mp4), se oye el
   * original. `copy`: se copia el audio (aac/mp3) a un m4a sin recodificar. `encode`: se
   * convierte a AAC.
   */
  audio: AudioSource
}

/** Códecs que se pueden meter en un m4a tal cual. */
const COPYABLE_AUDIO = ['aac', 'mp3']

/** Qué hay que generar para `info`, o `null` si Chromium lo reproduce tal cual. */
export function previewPlan(info: MediaInfo): PreviewPlan | null {
  if (info.isChromiumPlayable) return null
  const audioCodec = info.audioTracks[0]?.codec.toLowerCase() ?? ''
  const containerOk = info.container
    .toLowerCase()
    .split(',')
    .some((c) => PLAYABLE_CONTAINERS.includes(c))
  const audioOnly = info.videoCodec === null
  let audio: AudioSource = COPYABLE_AUDIO.includes(audioCodec) ? 'copy' : 'encode'
  if (!audioOnly && containerOk && PLAYABLE_AUDIO_CODECS.includes(audioCodec)) audio = 'original'
  return { audioOnly, audio }
}

/** Clave de caché: ruta (sin distinguir mayúsculas en Windows) + tamaño + fecha de modificación. */
export function previewKey(filePath: string, size: number, mtimeMs: number): string {
  const path = sep === '\\' ? normalize(filePath).toLowerCase() : normalize(filePath)
  return createHash('sha1')
    .update(`${path}\n${size}\n${Math.floor(mtimeMs)}`)
    .digest('hex')
}

const BASE_ARGS = ['-hide_banner', '-nostdin', '-nostats', '-loglevel', 'error', '-y']

/** Vista previa MP4 H.264 + AAC de la primera pista de video y la primera de audio. */
export function videoPreviewArgs(input: string, out: string): string[] {
  return [
    ...BASE_ARGS,
    '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn',
    // yuv420p 8 bits (el HEVC de 10 bits daría H.264 High 10, que Chromium no decodifica)
    // y dimensiones pares, que exige yuv420p.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '160k',
    '-max_muxing_queue_size', '4096',
    '-movflags', '+faststart',
    '-f', 'mp4',
    '-progress', 'pipe:1',
    out
  ] // prettier-ignore
}

/**
 * Cómo sacar el audio provisional, de más rápido a más seguro. `aac_mf` (Media Foundation
 * de Windows) convierte unas 9 veces más rápido que `aac`, pero falta en las ediciones N
 * de Windows y rechaza algunas frecuencias y canales; `aac` siempre está.
 */
export type AudioEncoder = 'copy' | 'aac_mf' | 'aac'

export function audioEncoders(copy: boolean): AudioEncoder[] {
  const encoders: AudioEncoder[] = process.platform === 'win32' ? ['aac_mf', 'aac'] : ['aac']
  return copy ? ['copy', ...encoders] : encoders
}

const AUDIO_CODEC_ARGS: Record<AudioEncoder, string[]> = {
  copy: ['-c:a', 'copy'],
  aac_mf: ['-c:a', 'aac_mf', '-b:a', '160k'],
  aac: ['-c:a', 'aac', '-aac_coder', 'fast', '-b:a', '160k']
}

/** Solo la primera pista de audio en un m4a, copiada o convertida a AAC. */
export function audioPreviewArgs(input: string, out: string, encoder: AudioEncoder): string[] {
  return [
    ...BASE_ARGS,
    '-i', input,
    '-map', '0:a:0', '-vn', '-sn', '-dn',
    ...AUDIO_CODEC_ARGS[encoder],
    '-movflags', '+faststart',
    '-f', 'mp4',
    '-progress', 'pipe:1',
    out
  ] // prettier-ignore
}

export interface CacheFile {
  name: string
  size: number
  mtimeMs: number
}

/**
 * Archivos a borrar para quedar en `maxBytes`, del menos al más usado. `keep` nunca se
 * borra (la vista previa recién hecha o la que suena), aunque ella sola pase del límite.
 */
export function pickEvictions(files: CacheFile[], maxBytes: number, keep: string[] = []): string[] {
  let total = files.reduce((sum, f) => sum + f.size, 0)
  const victims: string[] = []
  for (const f of [...files].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
    if (total <= maxBytes) break
    if (keep.includes(f.name)) continue
    victims.push(f.name)
    total -= f.size
  }
  return victims
}
