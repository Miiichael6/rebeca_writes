export type ScrollAlign = 'start' | 'center' | 'end' | 'auto'

/** Lo mínimo de un `DOMRect` que hace falta para decidir el desplazamiento. */
export interface Box {
  top: number
  bottom: number
}

/**
 * Cuánto hay que desplazar `container` para llevar `el` a la vista, o 0 si ya se ve entero.
 * Positivo baja la lista, negativo la sube.
 */
export function scrollDelta(el: Box, container: Box, align: ScrollAlign): number {
  if (el.top >= container.top && el.bottom <= container.bottom) return 0
  if (align === 'center') {
    return (el.top + el.bottom) / 2 - (container.top + container.bottom) / 2
  }
  if (align === 'start' || (align === 'auto' && el.top < container.top)) {
    return el.top - container.top
  }
  return el.bottom - container.bottom
}
