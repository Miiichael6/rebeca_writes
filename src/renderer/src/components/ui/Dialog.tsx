import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Acción destructiva: el botón de confirmar se pinta en rojo. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo modal de confirmación sobre `<dialog>` nativo: bloquea el fondo, atrapa el foco
 * y se cierra con Esc (que cuenta como cancelar).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // El foco empieza en Cancelar: un Enter por accidente no confirma una acción destructiva.
      // (showModal enfoca el primer botón, así que `autoFocus` no basta.)
      cancelRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: dejamos que el padre decida (controla `open`).
        e.preventDefault()
        onCancel()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{title}</h2>
        <p>{children}</p>
      </div>
      <div className="dialog-actions">
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  )
}
