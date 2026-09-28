import { useEffect } from 'react'
import { create } from 'zustand'
import type { PreviewStatus } from '@shared/types'

/**
 * Estado de las vistas previas (tarea 11), por id de medio. `OpenedMedia.preview` es una
 * foto del momento en que se abrió; lo que llega después por `media:preview` manda.
 */
interface PreviewState {
  byMedia: Record<string, PreviewStatus>
}

export const usePreviewStore = create<PreviewState>()(() => ({ byMedia: {} }))

/** Sigue los eventos del main. Se llama una vez, en App. */
export function usePreviewSync(): void {
  useEffect(
    () =>
      window.api.media.onPreview((event) => {
        if ('cleared' in event) usePreviewStore.setState({ byMedia: {} })
        else {
          usePreviewStore.setState((s) => ({
            byMedia: { ...s.byMedia, [event.mediaId]: event.status }
          }))
        }
      }),
    []
  )
}
