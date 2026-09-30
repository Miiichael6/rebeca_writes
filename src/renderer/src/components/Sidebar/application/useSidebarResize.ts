import { resizeKeyDelta } from '../domain/interaction'
import { usePorts } from './ports'

export interface SidebarResize {
  width: number
  min: number
  max: number
  reset: () => void
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
}

/** Cambiar el ancho del menú: arrastrando (con captura de puntero), con flechas o al restablecer. */
export function useSidebarResize(onResizing: (resizing: boolean) => void): SidebarResize {
  const { layout } = usePorts()
  const width = layout.useWidth()

  return {
    width,
    min: layout.limits.min,
    max: layout.limits.max,
    reset: () => layout.setWidth(layout.limits.default),
    onPointerDown: (e) => {
      e.preventDefault()
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startWidth = width
      onResizing(true)
      const move = (ev: PointerEvent): void =>
        layout.setWidth(startWidth + ev.clientX - startX, false)
      const end = (): void => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', end)
        el.removeEventListener('pointercancel', end)
        layout.setWidth(layout.currentWidth())
        onResizing(false)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', end)
      el.addEventListener('pointercancel', end)
    },
    onKeyDown: (e) => {
      const delta = resizeKeyDelta(e.key)
      if (delta === 0) return
      e.preventDefault()
      layout.setWidth(width + delta)
    }
  }
}
