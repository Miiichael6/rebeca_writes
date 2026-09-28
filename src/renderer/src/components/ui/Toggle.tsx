import { useTranslation } from 'react-i18next'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Nombre accesible del interruptor (p. ej. el título del ajuste). */
  'aria-label': string
  onLabel?: string
  offLabel?: string
  disabled?: boolean
}

/** Interruptor estilo Windows 11 con el texto "Activado/Desactivado" a la izquierda. */
export function Toggle({
  checked,
  onChange,
  onLabel,
  offLabel,
  disabled,
  ...rest
}: ToggleProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      className="toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-label" aria-hidden>
        {checked ? (onLabel ?? t('common.on')) : (offLabel ?? t('common.off'))}
      </span>
      <span className="toggle-track" />
    </button>
  )
}
