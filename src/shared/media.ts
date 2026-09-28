import type { MediaKind } from './types'

/** Extensiones mínimas que acepta la app (spec §3). ffmpeg puede leer más. */
export const VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'mpg', 'mpeg', 'ts', 'm2ts', '3gp', 'ogv'
] // prettier-ignore

export const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'amr', 'mka'
] // prettier-ignore

/** Video o audio según la extensión. Lo desconocido se trata como video. */
export function mediaKindOf(fileName: string): MediaKind {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  return AUDIO_EXTENSIONS.includes(ext) ? 'audio' : 'video'
}
