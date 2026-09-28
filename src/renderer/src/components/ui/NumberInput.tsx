import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  'aria-label': string
  disabled?: boolean
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Campo numérico con flechas arriba/abajo a la derecha. Lo escrito se valida al salir o con Enter. */
export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  disabled,
  ...rest
}: NumberInputProps): React.JSX.Element {
  const { t } = useTranslation()
  // Texto en edición; null = mostrar `value`. Permite estados intermedios como "" o "-".
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (n: number): void => {
    setDraft(null)
    if (Number.isFinite(n)) onChange(clamp(n, min, max))
  }

  return (
    <div className="field number-input">
      <input
        type="number"
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        disabled={disabled}
        aria-label={rest['aria-label']}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== null && commit(draft === '' ? value : Number(draft))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft !== null) commit(Number(draft))
          if (e.key === 'Escape') setDraft(null)
        }}
      />
      {/* Fuera del orden de tabulación: con el teclado ya funcionan ↑/↓ del propio input. */}
      <span className="number-input-steps">
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('common.increase')}
          disabled={disabled || value >= max}
          onClick={() => commit(value + step)}
        >
          <ChevronUp size={14} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('common.decrease')}
          disabled={disabled || value <= min}
          onClick={() => commit(value - step)}
        >
          <ChevronDown size={14} strokeWidth={1.5} />
        </button>
      </span>
    </div>
  )
}
