/** Cuánto hay que mantener presionado un ítem para empezar a seleccionar varios. */
export const LONG_PRESS_MS = 500

/** Lo que se puede mover el puntero durante la pulsación larga antes de cancelarla. */
export const LONG_PRESS_TOLERANCE_PX = 6

/** Cuánto cambia el ancho del menú cada vez que se pulsa una flecha. */
export const RESIZE_KEY_STEP_PX = 16

interface Point {
  x: number
  y: number
}

/** El puntero se alejó de donde empezó la pulsación más de lo tolerado. */
export function movedTooFar(from: Point, to: Point): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) > LONG_PRESS_TOLERANCE_PX
}

/** Cambio de ancho que pide una tecla: 0 si no es una de las flechas horizontales. */
export function resizeKeyDelta(key: string): number {
  if (key === 'ArrowRight') return RESIZE_KEY_STEP_PX
  if (key === 'ArrowLeft') return -RESIZE_KEY_STEP_PX
  return 0
}

interface Anchor {
  clientX: number
  clientY: number
}

interface Box {
  left: number
  bottom: number
}

/**
 * Dónde abrir el menú contextual. Desde el teclado (Mayús+F10 / tecla Menú) no hay puntero
 * —el evento llega en (0, 0)— y se abre bajo el ítem.
 */
export function menuAnchor(e: Anchor, item: Box): { x: number; y: number } {
  const keyboard = e.clientX === 0 && e.clientY === 0
  return {
    x: keyboard ? item.left + 20 : e.clientX,
    y: keyboard ? item.bottom : e.clientY
  }
}

type Keys = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' | 'repeat'>

/** F2 solo, como en el Explorador de Windows: renombra el archivo seleccionado. */
export function isRenameShortcut(e: Keys): boolean {
  return e.key === 'F2' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && !e.repeat
}
