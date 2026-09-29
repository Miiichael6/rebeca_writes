import { useEffect, useRef, type RefObject } from 'react'
import { MOTION } from './motion'
import type { MountState } from './mountTransition'
import { useLatest } from './useLatest'
import { useMountTransition } from './useMountTransition'

export interface ModalDialog {
  /** Va en el `<dialog>`; el hook llama a `showModal()` y `close()` en el momento justo. */
  ref: RefObject<HTMLDialogElement | null>
  /** Clase del estado de la animación: `entering`, `entered` o `exiting`. */
  state: MountState
}

/**
 * Abre y cierra un `<dialog>` nativo siguiendo un booleano, dejándolo abierto mientras dura
 * la animación de salida. `onOpen` se llama justo después de `showModal()` (para enfocar un
 * control o limpiar el formulario) y no hace falta que sea estable.
 */
export function useModalDialog(
  open: boolean,
  onOpen?: () => void,
  duration: number = MOTION
): ModalDialog {
  const ref = useRef<HTMLDialogElement>(null)
  const { mounted, state } = useMountTransition(open, duration)
  const onOpenRef = useLatest(onOpen)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!mounted) {
      if (dialog.open) dialog.close()
      return
    }
    if (!dialog.open) dialog.showModal()
    // Si se reabre mientras se estaba yendo, el `<dialog>` sigue abierto pero `onOpen` tiene que
    // volver a correr (enfocar, limpiar el formulario).
    if (open) onOpenRef.current?.()
  }, [mounted, open, onOpenRef])

  return { ref, state }
}
