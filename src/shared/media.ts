import { AUDIO_EXTENSIONS } from './formats'
import type { MediaKind } from './types'

/** Esquema propio con el que el main sirve medios locales al `<video>` (tarea 09). */
export const MEDIA_SCHEME = 'media'
export const MEDIA_HOST = 'file'

/** URL de un medio registrado en el main. Va por id opaco: el renderer nunca ve la ruta. */
export function mediaUrl(id: string): string {
  return `${MEDIA_SCHEME}://${MEDIA_HOST}/${encodeURIComponent(id)}`
}

/** Video o audio según la extensión. Lo desconocido se trata como video. */
export function mediaKindOf(fileName: string): MediaKind {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  return AUDIO_EXTENSIONS.includes(ext) ? 'audio' : 'video'
}
