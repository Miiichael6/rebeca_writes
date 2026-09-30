import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ESTIMATED_PARAGRAPH_PX,
  ESTIMATED_ROW_PX,
  OVERSCAN_PARAGRAPHS,
  OVERSCAN_SEGMENTS
} from '../domain/constants'
import type { RowVirtualizer, VirtualizationOptions } from '../application/ports'

/** Adaptador del puerto de virtualización sobre `@tanstack/react-virtual`. */
export function useRowVirtualizer({
  count,
  joinLines,
  scrollRef
}: VirtualizationOptions): RowVirtualizer {
  // El virtualizador es mutable a propósito; a las filas solo pasan números y `measureElement`,
  // que es estable.
  // eslint-disable-next-line react-hooks/incompatible-library
  return useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (joinLines ? ESTIMATED_PARAGRAPH_PX : ESTIMATED_ROW_PX),
    overscan: joinLines ? OVERSCAN_PARAGRAPHS : OVERSCAN_SEGMENTS,
    // Con la vista estable, `start` y `measure` no cambian entre renders y `memo` funciona.
    // El prefijo separa las medidas de párrafos y de segmentos al cambiar "Unir líneas".
    getItemKey: (index) => `${joinLines ? 'p' : 's'}${index}`
  })
}
