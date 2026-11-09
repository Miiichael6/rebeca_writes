import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '@shared/types'
import { usePorts } from '../application/ports'
import type { EntryActions } from '../application/useEntryActions'
import type { TFunction } from 'i18next'
import { folderName, type HistoryGroup, type HistoryGroupKey } from '@renderer/lib/historyGroups'
import type { HistoryListModel } from '../application/useHistoryList'
import type { MultiSelect } from '../application/useMultiSelect'
import { HistoryItem } from './HistoryItem'

interface HistoryListProps {
  list: HistoryListModel
  select: MultiSelect
  actions: EntryActions
}

/** Título del grupo: la fecha, la carpeta o el programa, según cómo se agrupe. */
function groupLabel(g: HistoryGroup, t: TFunction): string {
  if (g.app !== undefined) return g.app || t('historyGroups.noApp')
  if (g.folder !== undefined) return g.folder ? folderName(g.folder) : t('historyGroups.noFolder')
  return t(`historyGroups.${g.key as HistoryGroupKey}`)
}

const FOLDED_KEY = 'history-folded-groups'

function loadFolded(): Set<string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((k) => typeof k === 'string') : [])
  } catch {
    return new Set()
  }
}

/** Historial agrupado por fecha; cada grupo se pliega pulsando su título. */
export function HistoryList({ list, select, actions }: HistoryListProps): React.JSX.Element {
  const { t } = useTranslation()
  const { history } = usePorts()
  const [folded, setFolded] = useState(loadFolded)

  const toggleGroup = (key: string): void => {
    const next = new Set(folded)
    if (!next.delete(key)) next.add(key)
    setFolded(next)
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...next]))
    } catch {
      // Sin almacenamiento el estado vale solo para esta sesión.
    }
  }

  const allFolded = list.groups.length > 0 && list.groups.every((g) => folded.has(g.key))

  const toggleAll = (): void => {
    const next = new Set(folded)
    for (const g of list.groups) {
      if (allFolded) next.delete(g.key)
      else next.add(g.key)
    }
    setFolded(next)
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...next]))
    } catch {
      // Sin almacenamiento el estado vale solo para esta sesión.
    }
  }

  const onSelect = (entry: HistoryEntry): void =>
    select.active ? select.toggle(entry.id) : history.select(entry.id)

  return (
    <nav className="history" aria-label={t('sidebar.history')}>
      <div className="history-bar">
        <div className="history-mode" role="tablist" aria-label={t('sidebar.groupBy')}>
          <button
            type="button"
            role="tab"
            className={list.mode === 'folder' ? 'active' : ''}
            aria-selected={list.mode === 'folder'}
            onClick={() => list.setMode('folder')}
          >
            {t('sidebar.groupByFolder')}
          </button>
          <button
            type="button"
            role="tab"
            className={list.mode === 'date' ? 'active' : ''}
            aria-selected={list.mode === 'date'}
            onClick={() => list.setMode('date')}
          >
            {t('sidebar.groupByDate')}
          </button>
          <button
            type="button"
            role="tab"
            className={list.mode === 'app' ? 'active' : ''}
            aria-selected={list.mode === 'app'}
            onClick={() => list.setMode('app')}
          >
            {t('sidebar.groupByApp')}
          </button>
        </div>
        <button
          type="button"
          className="history-fold-all"
          title={allFolded ? t('sidebar.expandAll') : t('sidebar.collapseAll')}
          aria-label={allFolded ? t('sidebar.expandAll') : t('sidebar.collapseAll')}
          disabled={list.groups.length === 0}
          onClick={toggleAll}
        >
          {allFolded ? (
            <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden />
          ) : (
            <ChevronsDownUp size={16} strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
      {list.groups.map((g) => (
        <section className={`history-group${folded.has(g.key) ? ' folded' : ''}`} key={g.key}>
          <h3>
            <button
              type="button"
              className="history-group-toggle"
              aria-expanded={!folded.has(g.key)}
              onClick={() => toggleGroup(g.key)}
            >
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
              <span title={g.folder || undefined}>{groupLabel(g, t)}</span>
              <span className="history-group-count">{g.entries.length}</span>
            </button>
          </h3>
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
