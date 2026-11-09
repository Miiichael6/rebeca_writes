import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { activeEntries, dictionaryParts, type DictionaryEntry } from '@shared/dictionary'
import { savableEntries } from '../domain/entries'

/** Campo para escribir una frase y ver al momento qué palabras cambiaría el diccionario. */
export function TryField({ entries }: { entries: readonly DictionaryEntry[] }): React.JSX.Element {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState('')
  const parts = useMemo(
    () => dictionaryParts(text, activeEntries(savableEntries(entries))),
    [text, entries]
  )
  const changed = parts.some((p) => p.replaced)

  return (
    <div className="dict-try">
      <label htmlFor={id} className="dict-try-label">
        {t('dictionary.try')}
      </label>
      <input
        id={id}
        className="input"
        value={text}
        placeholder={t('dictionary.tryPlaceholder')}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim() !== '' && (
        <p className="dict-try-result" aria-live="polite">
          {changed
            ? parts.map((p, i) => (p.replaced ? <mark key={i}>{p.text}</mark> : p.text))
            : t('dictionary.tryNoChange')}
        </p>
      )}
    </div>
  )
}
