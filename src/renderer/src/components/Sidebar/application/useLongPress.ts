import { useEffect, useRef } from 'react'
import { LONG_PRESS_MS, movedTooFar } from '../domain/interaction'

type PointerHandler = (e: React.PointerEvent<HTMLElement>) => void

export interface LongPress {
  handlers: {
    onPointerDown: PointerHandler
    onPointerMove: PointerHandler
    onPointerUp: PointerHandler
    onPointerCancel: PointerHandler
    onPointerLeave: PointerHandler
  }
  /**
   * `true` si el clic que llega es el que sigue a una pulsación larga: hay que descartarlo para
   * que no abra el archivo ni desmarque lo recién marcado.
   */
  consumeClick: () => boolean
}

/**
 * Mantener presionado (sin mover el puntero) llama a `onLongPress`. `disabled` la desactiva,
 * p. ej. cuando ya se está seleccionando.
 */
export function useLongPress(onLongPress: () => void, disabled: boolean): LongPress {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  const longPressed = useRef(false)
  const cancel = (): void => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }
  useEffect(() => cancel, [])

  return {
    handlers: {
      onPointerDown: (e) => {
        if (e.button !== 0 || disabled) return
        longPressed.current = false
        press.current = {
          x: e.clientX,
          y: e.clientY,
          timer: window.setTimeout(() => {
            press.current = null
            longPressed.current = true
            onLongPress()
          }, LONG_PRESS_MS)
        }
      },
      onPointerMove: (e) => {
        const p = press.current
        if (p && movedTooFar(p, { x: e.clientX, y: e.clientY })) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel
    },
    consumeClick: () => {
      if (!longPressed.current) return false
      longPressed.current = false
      return true
    }
  }
}
