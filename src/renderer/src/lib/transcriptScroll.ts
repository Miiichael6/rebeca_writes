/**
 * Desplazamiento de la lista de la transcripción desde fuera del componente (búsqueda en la
 * tarea 14, desplazamiento automático en la 15). La lista está virtualizada: el segmento
 * puede no estar en el DOM, así que no sirve `scrollIntoView`.
 */

export type ScrollAlign = 'start' | 'center' | 'end' | 'auto'

type Scroller = (index: number, align: ScrollAlign) => void

let scroller: Scroller | null = null

/** Lo registra la lista al montarse; devuelve la función para quitarlo. */
export function registerTranscriptScroller(fn: Scroller): () => void {
  scroller = fn
  return () => {
    if (scroller === fn) scroller = null
  }
}

/** Lleva el segmento `index` a la vista. No hace nada si la lista no está montada. */
export function scrollToSegment(index: number, align: ScrollAlign = 'auto'): void {
  scroller?.(index, align)
}
