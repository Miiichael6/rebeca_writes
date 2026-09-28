import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Acción destructiva: el botón de confirmar se pinta en rojo. */
  danger?: boolean
  /** El foco empieza en Confirmar; para cuando lo destructivo es Cancelar. */
  focusConfirm?: boolean
  /** Elemento que recibe el foco al abrir (p. ej. un campo de texto); manda sobre `focusConfirm`. */
  initialFocus?: RefObject<HTMLElement | null>
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
  confirmLabel,
  cancelLabel,
  danger,
  focusConfirm,
  initialFocus,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // El foco empieza en Cancelar: un Enter por accidente no confirma una acción destructiva.
      // (showModal enfoca el primer botón, así que `autoFocus` no basta.)
      ;(initialFocus ?? (focusConfirm ? confirmRef : cancelRef)).current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, focusConfirm, initialFocus])

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
        <div className="dialog-text">{children}</div>
      </div>
      <div className="dialog-actions">
        <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel ?? t('common.accept')}
        </Button>
        <Button ref={cancelRef} onClick={onCancel}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
      </div>
    </dialog>
  )
}
