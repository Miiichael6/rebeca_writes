import type { OpenedMedia, PreviewStatus } from '@shared/types'

/** Estado actual de la vista previa de `media`. */
export function previewOf(
  byMedia: Record<string, PreviewStatus>,
  media: OpenedMedia
): PreviewStatus {
  return byMedia[media.id] ?? media.preview
}

/** Lo que tiene que reproducir el `<video>` para un medio según su vista previa. */
export interface Playback {
  /** Id de `media://` que suena, o `null` si todavía no hay nada que reproducir. */
  sourceId: string | null
  /** `false`: fondo neutro con el nombre (solo audio, o audio mientras llega el video). */
  hasVideo: boolean
  /** Porcentaje mientras se genera la vista previa. */
  preparing: number | null
  failed: boolean
}

export function playbackFor(media: OpenedMedia, status: PreviewStatus): Playback {
  const isVideo = media.info ? media.info.videoCodec !== null : true
  switch (status.state) {
    case 'none':
      return { sourceId: media.id, hasVideo: isVideo, preparing: null, failed: false }
    case 'ready':
      return { sourceId: status.id, hasVideo: isVideo, preparing: null, failed: false }
    case 'pending':
      // Mientras tanto solo audio, aunque sea el original: su video no se puede ver.
      return { sourceId: status.audioId, hasVideo: false, preparing: status.percent, failed: false }
    case 'failed':
      return { sourceId: status.audioId, hasVideo: false, preparing: null, failed: true }
  }
}
