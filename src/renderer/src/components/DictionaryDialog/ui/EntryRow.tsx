import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DictionaryEntry } from '@shared/dictionary'
import { Button, Checkbox } from '../../ui'
import { SpokenChips } from './SpokenChips'

interface EntryRowProps {
  entry: DictionaryEntry
  entries: readonly DictionaryEntry[]
  autoFocus: boolean
  onChange: (entry: DictionaryEntry) => void
  onRemove: (id: string) => void
}

/** Una palabra del diccionario: lo que se escucha, cómo se escribe, plural, activa y borrar. */
export function EntryRow({
  entry,
  entries,
  autoFocus,
  onChange,
  onRemove
}: EntryRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const name = entry.written.trim() || entry.spoken[0] || t('dictionary.newWord')
  const missingWritten = entry.spoken.length > 0 && entry.written.trim() === ''

  return (
    <div className={entry.enabled ? 'dict-row' : 'dict-row disabled'} role="row">
      <div role="cell">
        <SpokenChips
          entry={entry}
          entries={entries}
          onChange={onChange}
          autoFocus={autoFocus}
          label={t('dictionary.spokenOf', { name })}
        />
      </div>
      <div role="cell" className="dict-written-cell">
        <input
          className={missingWritten ? 'input invalid' : 'input'}
          value={entry.written}
          aria-label={t('dictionary.writtenOf', { name })}
          aria-invalid={missingWritten || undefined}
          placeholder={t('dictionary.writtenPlaceholder')}
          onChange={(e) => onChange({ ...entry, written: e.target.value })}
        />
        {missingWritten && <span className="dict-error">{t('dictionary.writtenMissing')}</span>}
      </div>
      <div role="cell" className="dict-check-cell">
        <Checkbox checked={entry.plural} onChange={(plural) => onChange({ ...entry, plural })}>
          <span className="visually-hidden">{t('dictionary.pluralOf', { name })}</span>
        </Checkbox>
      </div>
      <div role="cell" className="dict-check-cell">
        <Checkbox checked={entry.enabled} onChange={(enabled) => onChange({ ...entry, enabled })}>
          <span className="visually-hidden">{t('dictionary.enabledOf', { name })}</span>
        </Checkbox>
      </div>
      <div role="cell" className="dict-check-cell">
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('dictionary.removeOf', { name })}
          icon={<Trash2 size={15} strokeWidth={1.5} />}
          onClick={() => onRemove(entry.id)}
        />
      </div>
    </div>
  )
}
