import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DictionaryEntry } from '@shared/dictionary'
import { addSpoken, formKey, ownerOfForm } from '../domain/entries'

interface SpokenChipsProps {
  entry: DictionaryEntry
  entries: readonly DictionaryEntry[]
  onChange: (entry: DictionaryEntry) => void
  autoFocus?: boolean
  label: string
}

/**
 * Formas habladas de una palabra como chips: Enter o coma añade lo escrito, × quita una y
 * Retroceso con el campo vacío quita la última. Una forma que ya usa otra palabra no entra.
 */
export function SpokenChips({
  entry,
  entries,
  onChange,
  autoFocus,
  label
}: SpokenChipsProps): React.JSX.Element {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Intenta añadir el borrador; `true` si quedó vacío (añadido o no había nada). */
  const commit = (): boolean => {
    if (!formKey(draft)) {
      setDraft('')
      return true
    }
    const owner = ownerOfForm(entries, draft, entry.id)
    if (owner) {
      setError(t('dictionary.spokenTaken', { written: owner.written || '…' }))
      return false
    }
    onChange(addSpoken(entry, draft))
    setDraft('')
    setError(null)
    return true
  }

  const removeAt = (index: number): void =>
    onChange({ ...entry, spoken: entry.spoken.filter((_, i) => i !== index) })

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && draft === '' && entry.spoken.length > 0) {
      e.preventDefault()
      removeAt(entry.spoken.length - 1)
    }
  }

  return (
    <div className="dict-chips-cell">
      <div className={error ? 'dict-chips input invalid' : 'dict-chips input'}>
        {entry.spoken.map((form, i) => (
          <span key={`${form}-${i}`} className="dict-chip">
            {form}
            <button
              type="button"
              className="dict-chip-remove"
              aria-label={t('dictionary.removeSpoken', { form })}
              title={t('dictionary.removeSpoken', { form })}
              onClick={() => removeAt(i)}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          className="dict-chips-input"
          value={draft}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          placeholder={entry.spoken.length === 0 ? t('dictionary.spokenPlaceholder') : undefined}
          autoFocus={autoFocus}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            commit()
          }}
        />
      </div>
      {error && (
        <span className="dict-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
