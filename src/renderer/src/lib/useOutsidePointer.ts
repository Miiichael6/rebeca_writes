import { useEffect } from 'react'
import { useLatest } from './useLatest'

/**
 * Avisa cuando se pulsa fuera de un elemento, para cerrar menús y desplegables. `boundaryOf`
 * devuelve la zona que cuenta como "dentro" (normalmente el ancla, para que el clic en el botón
 * que abre lo gestione el propio botón).
 */
export function useOutsidePointer(
  active: boolean,
  boundaryOf: () => Element | null | undefined,
  onOutside: () => void
): void {
  const boundaryRef = useLatest(boundaryOf)
  const onOutsideRef = useLatest(onOutside)

  useEffect(() => {
    if (!active) return
    const onPointerDown = (e: PointerEvent): void => {
      const boundary = boundaryRef.current()
      if (!boundary?.contains(e.target as Node)) onOutsideRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [active, boundaryRef, onOutsideRef])
}
