import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { VIDEO_HEIGHT_MAX } from '@shared/settings'
import { isCovered, isMaximized, maximizeTarget } from '../domain/stage'
import { usePorts } from './ports'

export interface VideoStage {
  /** Alto que se ve: el provisional mientras se arrastra, o el guardado. */
  height: number
  dragging: boolean
  limit: number
  maximized: boolean
  /** `null` al soltar el asa; el alto definitivo lo guarda quien suelta. */
  setDragHeight: (height: number | null) => void
  toggleMaximize: () => void
}

interface Options {
  playerRef: RefObject<HTMLElement | null>
  hasMedia: boolean
  hasVideo: boolean
}

/** Alto del panel de video: límite disponible, arrastre, maximizar y aviso de transcripción tapada. */
export function useVideoStage({ playerRef, hasMedia, hasVideo }: Options): VideoStage {
  const { settings, view, stage } = usePorts()
  const videoVisible = view.useVideoVisible()
  const savedHeight = settings.useVideoHeight()
  // Alto provisional mientras se arrastra; al soltar pasa a los ajustes.
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const height = dragHeight ?? savedHeight

  // Espacio disponible para el panel: se recalcula al cambiar el tamaño de la ventana.
  const [limit, setLimit] = useState(VIDEO_HEIGHT_MAX)
  useLayoutEffect(() => {
    const player = playerRef.current
    if (!player) return
    return stage.observeLimit(player, setLimit)
  }, [playerRef, stage])

  const maximized = isMaximized(height, limit)
  const restoreHeight = useRef(savedHeight)
  const toggleMaximize = (): void => {
    const next = maximizeTarget({ maximized, height, restore: restoreHeight.current, limit })
    restoreHeight.current = next.restore
    settings.setVideoHeight(next.height)
  }

  const covered = isCovered({ hasMedia, hasVideo, videoVisible, height, limit })
  useEffect(() => {
    view.setTranscriptCovered(covered)
    return () => view.setTranscriptCovered(false)
  }, [covered, view])

  return { height, dragging: dragHeight !== null, limit, maximized, setDragHeight, toggleMaximize }
}
