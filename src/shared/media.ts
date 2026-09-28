import { AUDIO_EXTENSIONS } from './formats'
import type { MediaKind } from './types'

/** Video o audio según la extensión. Lo desconocido se trata como video. */
export function mediaKindOf(fileName: string): MediaKind {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  return AUDIO_EXTENSIONS.includes(ext) ? 'audio' : 'video'
}
