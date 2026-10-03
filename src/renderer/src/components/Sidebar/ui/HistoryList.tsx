import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '@shared/types'
import { usePorts } from '../application/ports'
import type { EntryActions } from '../application/useEntryActions'
import type { HistoryListModel } from '../application/useHistoryList'
import type { MultiSelect } from '../application/useMultiSelect'
import { HistoryItem } from './HistoryItem'

interface HistoryListProps {
  list: HistoryListModel
  select: MultiSelect
  actions: EntryActions
}

/** Historial agrupado por fecha. */
export function HistoryList({ list, select, actions }: HistoryListProps): React.JSX.Element {
  const { t } = useTranslation()
  const { history } = usePorts()

  const onSelect = (entry: HistoryEntry): void =>
    select.active ? select.toggle(entry.id) : history.select(entry.id)

  return (
    <nav className="history" aria-label={t('sidebar.history')}>
      {list.groups.map((g) => (
        <section className="history-group" key={g.key}>
          <h3>{t(`historyGroups.${g.key}`)}</h3>
          {g.entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              selected={entry.id === list.selectedId}
              unseen={list.unseen.has(entry.id)}
              exiting={list.exiting.has(entry.id)}
              selecting={select.active}
              checked={select.isChecked(entry.id)}
              onSelect={() => onSelect(entry)}
              onLongPress={() => select.begin(entry.id)}
              onContextMenu={(e) =>
                select.active ? e.preventDefault() : actions.openMenu(entry, e)
              }
            />
          ))}
        </section>
      ))}
      {list.groups.length === 0 && (
        <p className="history-empty">
          {list.entries.length === 0 ? t('sidebar.empty') : t('sidebar.noResults')}
        </p>
      )}
    </nav>
  )
}
