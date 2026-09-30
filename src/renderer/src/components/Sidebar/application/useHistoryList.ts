import { useMemo } from 'react'
import type { HistoryEntry } from '@shared/types'
import { filterHistory } from '@renderer/lib/historyFilter'
import { groupHistory, type HistoryGroup } from '@renderer/lib/historyGroups'
import { usePorts } from './ports'

export interface HistoryListModel {
  entries: HistoryEntry[]
  selectedId: string | null
  filter: string
  /** Entradas que pasan el filtro. */
  filtered: HistoryEntry[]
  visibleIds: ReadonlySet<string>
  /** Grupos por fecha de lo que se pinta, incluidas las entradas que están saliendo. */
  groups: HistoryGroup[]
  /** Ids de las entradas que se están quitando (se pinta su salida antes de sacarlas). */
  exiting: ReadonlySet<string>
}

/** Historial filtrado, con las bajas animadas y agrupado por fecha. */
export function useHistoryList(): HistoryListModel {
  const { history } = usePorts()
  const entries = history.useEntries()
  const selectedId = history.useSelectedId()
  const filter = history.useFilter()
  const textMatches = history.useTextMatches()

  const filtered = useMemo(
    () => filterHistory(entries, filter, textMatches),
    [entries, filter, textMatches]
  )
  // Las entradas quitadas siguen en su grupo mientras dura su animación de salida.
  const shown = history.useExiting(filtered)
  const groups = useMemo(() => groupHistory(shown.items), [shown.items])
  const visibleIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered])

  return { entries, selectedId, filter, filtered, visibleIds, groups, exiting: shown.exiting }
}
