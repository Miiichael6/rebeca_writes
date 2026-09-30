import { useCallback, useEffect } from 'react'
import type { HistoryEntry, OpenedMedia } from '@shared/types'
import type { Playback } from '@renderer/lib/preview'
import { usePorts } from './ports'

export interface PlaybackSource {
  entry: HistoryEntry | null
  media: OpenedMedia | null | undefined
  playback: Playback | null
}

/** Carga en el reproductor el archivo de la entrada abierta (o su vista previa cuando llega). */
export function usePlaybackSource(): PlaybackSource {
  const { library, playback: player } = usePorts()
  const entry = library.useEntry()
  const media = library.useMedia(entry?.id)
  const playback = library.usePlayback(media)
  const fallbackDuration = entry?.durationSec ?? 0

  useEffect(() => {
    player.load(
      media && playback
        ? {
            key: media.id,
            sourceId: playback.sourceId,
            hasVideo: playback.hasVideo,
            duration: media.info?.durationSec || fallbackDuration
          }
        : null
    )
  }, [media, playback, fallbackDuration, player])

  return { entry, media, playback }
}

/** Ref con limpieza (React 19): registra el `<video>` mientras está montado. */
export function useVideoElement(): (el: HTMLVideoElement | null) => void | (() => void) {
  const { playback } = usePorts()
  return useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return
      return playback.bindElement(el)
    },
    [playback]
  )
}
