import { useId, useState } from 'react'
import { ChevronDown, Download, Plus, Search, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useModalDialog } from '@renderer/lib/useModalDialog'
import { usePorts } from '../application/ports'
import { useDictionary } from '../application/useDictionary'
import { useDictionaryFile } from '../application/useDictionaryFile'
import { filterEntries, SEARCH_THRESHOLD } from '../domain/entries'
import { Button, Menu } from '../../ui'
import { EntryRow } from './EntryRow'
import { TryField } from './TryField'

/**
 * Editor del diccionario de reemplazos: una fila por palabra, con lo que Whisper escucha y cómo
 * debe quedar escrito. Se guarda solo; se puede probar, importar y exportar.
 */
export function DictionaryDialog(): React.JSX.Element {
  const { t } = useTranslation()
  const { visibility } = usePorts()
  const open = visibility.useOpen()
  const titleId = useId()
  const [query, setQuery] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const model = useDictionary(open)
  const file = useDictionaryFile(model.entries, model.replaceAll)
  const { ref, state } = useModalDialog(open, () => setQuery(''))

  const searchable = model.entries.length > SEARCH_THRESHOLD
  const shown = searchable ? filterEntries(model.entries, query) : model.entries

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-wide dict-dialog ${state}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        visibility.close()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{t('dictionary.title')}</h2>
        <p className="dialog-text">{t('dictionary.intro')}</p>

        <div className="dict-toolbar">
          <Button size="sm" icon={<Plus size={15} strokeWidth={1.5} />} onClick={model.add}>
            {t('dictionary.add')}
          </Button>
          {searchable && (
            <label className="dict-search">
              <Search size={14} strokeWidth={1.5} aria-hidden />
              <input
                className="input"
                type="search"
                value={query}
                aria-label={t('dictionary.search')}
                placeholder={t('dictionary.search')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
        </div>

        {model.loaded && model.entries.length === 0 ? (
          <div className="dict-empty">
            <p>{t('dictionary.empty')}</p>
            <p className="dialog-hint">{t('dictionary.emptyExample')}</p>
          </div>
        ) : (
          <div className="dict-table" role="table" aria-label={t('dictionary.title')}>
            <div className="dict-row dict-head" role="row">
              <span role="columnheader">{t('dictionary.spoken')}</span>
              <span role="columnheader">{t('dictionary.written')}</span>
              <span role="columnheader" className="dict-check-cell">
                {t('dictionary.plural')}
              </span>
              <span role="columnheader" className="dict-check-cell">
                {t('dictionary.enabled')}
              </span>
              <span role="columnheader">
                <span className="visually-hidden">{t('dictionary.remove')}</span>
              </span>
            </div>
            {shown.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                entries={model.entries}
                autoFocus={entry.id === model.addedId}
                onChange={model.change}
                onRemove={model.remove}
              />
            ))}
            {searchable && shown.length === 0 && (
              <p className="dialog-hint dict-no-results">{t('dictionary.noResults')}</p>
            )}
          </div>
        )}

        <TryField entries={model.entries} />
      </div>

      <div className="dialog-actions dict-actions">
        <div className="dict-file-actions">
          <Button size="sm" icon={<Upload size={14} strokeWidth={1.5} />} onClick={file.importFile}>
            {t('dictionary.import')}
          </Button>
          <div className="menu-anchor">
            <Button
              size="sm"
              icon={<Download size={14} strokeWidth={1.5} />}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              disabled={model.entries.length === 0}
              onClick={() => setExportOpen((o) => !o)}
            >
              {t('dictionary.export')}
              <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
            </Button>
            <Menu
              open={exportOpen}
              onClose={() => setExportOpen(false)}
              placement="top-start"
              aria-label={t('dictionary.export')}
              items={[
                { label: t('dictionary.exportJson'), onSelect: () => file.exportFile('json') },
                { label: t('dictionary.exportCsv'), onSelect: () => file.exportFile('csv') }
              ]}
            />
          </div>
        </div>
        <Button variant="primary" onClick={visibility.close}>
          {t('common.close')}
        </Button>
      </div>
    </dialog>
  )
}
