import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { paragraphOf, toParagraphs, type Paragraph } from '@shared/joinLines'
import type { Segment } from '@shared/types'
import { isScrollKey } from '../domain/keyboard'
import { scrollDelta, type ScrollAlign } from '../domain/scrollGeometry'
import { usePorts, type RowVirtualizer } from './ports'
import { useSegmentEditing, type EditHandlers } from './useSegmentEditing'
import { useSegmentMenu, type SegmentMenuState } from './useSegmentMenu'
import type { EditDraft } from '../domain/editing'

/** Lleva `el` a la vista dentro de `container`, salvo que ya se vea entero. */
function scrollElementIntoView(container: HTMLElement, el: HTMLElement, align: ScrollAlign): void {
  container.scrollTop += scrollDelta(
    el.getBoundingClientRect(),
    container.getBoundingClientRect(),
    align
  )
}

export interface SegmentListModel {
  joinLines: boolean
  /** Los párrafos de "Unir líneas", o `null` si cada fila es un segmento. */
  paragraphs: Paragraph[] | null
  virtualizer: RowVirtualizer
  /** Segmento que suena, o `null`. */
  activeIndex: number | null
  arriving: (index: number) => boolean
  seek: (time: number) => void
  edit: EditHandlers
  activeEdit: EditDraft | null
  editable: boolean
  menu: SegmentMenuState | null
  closeMenu: () => void
  /** Muestra el botón "Volver al actual". */
  showReturn: boolean
  followCurrent: () => void
  /** Manejadores del contenedor con scroll. */
  body: {
    onScroll: () => void
    onWheel: () => void
    onTouchMove: () => void
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
    onContextMenu: (e: React.MouseEvent) => void
  }
}

/**
 * Lógica de la lista virtualizada (spec §7): qué filas hay, hacia dónde se desplaza sola, cómo
 * se edita y cuándo se pausa el seguimiento. La vista solo pinta lo que este modelo le da.
 */
export function useSegmentList(
  segments: Segment[],
  lockedMessage: string
): {
  /** Va aparte del modelo: es una ref y no debe leerse al pintar. */
  scrollRef: React.RefObject<HTMLDivElement | null>
  model: SegmentListModel
} {
  const { playback, settings, transcript, animation, virtualization, scroll } = usePorts()
  const scrollRef = useRef<HTMLDivElement>(null)
  const joinLines = settings.useJoinLines()
  const autoScroll = settings.useAutoScroll()
  const arriving = animation.useArrivals(segments.length)
  const playing = playback.usePlaying()
  const transcribing = transcript.useIsTranscribing()
  const activeIndex = playback.useActiveSegment(segments)
  const playerSeek = playback.seek

  const paragraphs = useMemo(
    () => (joinLines ? toParagraphs(segments) : null),
    [joinLines, segments]
  )
  const rowCount = paragraphs ? paragraphs.length : segments.length
  const rowOf = useCallback(
    (segment: number) => (paragraphs ? paragraphOf(paragraphs, segment) : segment),
    [paragraphs]
  )

  const virtualizer = virtualization.useRows({ count: rowCount, joinLines, scrollRef })

  /** Primer segmento visible, para no perder el sitio al cambiar "Unir líneas". */
  const topSegmentRef = useRef(0)
  const onScroll = (): void => {
    const container = scrollRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top
    for (const el of container.querySelectorAll<HTMLElement>('[data-seg]')) {
      if (el.getBoundingClientRect().bottom > top) {
        topSegmentRef.current = Number(el.dataset.seg)
        return
      }
    }
  }
  const prevJoinRef = useRef(joinLines)
  useLayoutEffect(() => {
    if (prevJoinRef.current === joinLines) return
    prevJoinRef.current = joinLines
    virtualizer.scrollToIndex(rowOf(topSegmentRef.current), { align: 'start' })
  }, [joinLines, rowOf, virtualizer])

  /** Lleva un segmento a la vista: si ya está en el DOM, con precisión dentro del párrafo. */
  const reveal = useCallback(
    (segment: number, align: ScrollAlign) => {
      const container = scrollRef.current
      if (!container) return
      const el = container.querySelector<HTMLElement>(`[data-seg="${segment}"]`)
      if (el) scrollElementIntoView(container, el, align)
      else virtualizer.scrollToIndex(rowOf(segment), { align, behavior: 'auto' })
    },
    [rowOf, virtualizer]
  )

  // Desplazamiento automático. `following` pasa a `false` cuando el usuario desplaza a mano
  // o navega la búsqueda, y vuelve con "Volver al actual", al hacer clic en un segmento o al
  // volver a activar la casilla.
  const [following, setFollowing] = useState(true)
  const [prevAutoScroll, setPrevAutoScroll] = useState(autoScroll)
  if (prevAutoScroll !== autoScroll) {
    setPrevAutoScroll(autoScroll)
    if (autoScroll) setFollowing(true)
  }
  const followPlayback = playing && activeIndex !== null
  const followLive = !playing && transcribing
  const pauseFollow = (): void => {
    if (autoScroll) setFollowing(false)
  }

  useEffect(() => {
    if (!autoScroll || !following) return
    if (followPlayback) reveal(activeIndex, 'center')
    else if (followLive && rowCount > 0) {
      virtualizer.scrollToIndex(rowCount - 1, { align: 'end', behavior: 'auto' })
    }
  }, [
    autoScroll,
    following,
    followPlayback,
    followLive,
    activeIndex,
    rowCount,
    segments,
    reveal,
    virtualizer
  ])

  useEffect(
    () =>
      scroll.register((index, align) => {
        // La búsqueda manda: si no, el autoscroll se llevaría la vista de la coincidencia.
        setFollowing(false)
        reveal(index, align)
      }),
    [scroll, reveal]
  )

  const seek = useCallback(
    (time: number) => {
      setFollowing(true)
      playerSeek(time)
    },
    [playerSeek]
  )

  const stopFollowing = useCallback(() => setFollowing(false), [])
  const followCurrent = useCallback(() => setFollowing(true), [])
  const { edit, activeEdit, editable } = useSegmentEditing({
    scrollRef,
    // Que el autoscroll no se lleve la vista mientras se escribe.
    onStart: stopFollowing,
    lockedMessage
  })
  const { menu, close: closeMenu, onContextMenu } = useSegmentMenu(editable)

  const model: SegmentListModel = {
    joinLines,
    paragraphs,
    virtualizer,
    activeIndex,
    arriving,
    seek,
    edit,
    activeEdit,
    editable,
    menu,
    closeMenu,
    showReturn: autoScroll && !following && (followPlayback || followLive),
    followCurrent,
    body: {
      onScroll,
      onWheel: pauseFollow,
      onTouchMove: pauseFollow,
      onPointerDown: (e) => {
        // Clic en el propio contenedor: la barra de desplazamiento.
        if (e.target === e.currentTarget) pauseFollow()
      },
      onKeyDown: (e) => {
        if (isScrollKey(e)) pauseFollow()
      },
      onContextMenu
    }
  }
  return { scrollRef, model }
}
