import { useToastStore } from '@renderer/store/toast'

/** Muestra los avisos no bloqueantes de `toast()`. Se monta una sola vez en App. */
export function Toaster(): React.JSX.Element {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.message}
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.onSelect()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
