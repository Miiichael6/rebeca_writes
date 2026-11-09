import { useMemo, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
import { filterHistory } from '@renderer/lib/historyFilter'
import {
  groupHistory,
  groupHistoryByApp,
  groupHistoryByFolder,
  type HistoryGroup,
  type HistoryGroupMode
} from '@renderer/lib/historyGroups'
import { usePorts } from './ports'

export interface HistoryListModel {
  entries: HistoryEntry[]
  selectedId: string | null
  /** Entradas terminadas que el usuario aún no ha abierto. */
  unseen: ReadonlySet<string>
  filter: string
  /** Entradas que pasan el filtro. */
  filtered: HistoryEntry[]
  visibleIds: ReadonlySet<string>
  /** Cómo se agrupa: por carpeta del archivo o por fecha. */
  mode: HistoryGroupMode
  setMode: (mode: HistoryGroupMode) => void
  /** Grupos de lo que se pinta, incluidas las entradas que están saliendo. */
  groups: HistoryGroup[]
  /** Ids de las entradas que se están quitando (se pinta su salida antes de sacarlas). */
  exiting: ReadonlySet<string>
}

const MODE_KEY = 'history-group-mode'

function loadMode(): HistoryGroupMode {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    return saved === 'folder' || saved === 'app' ? saved : 'date'
  } catch {
    return 'date'
  }
}

/** Historial filtrado, con las bajas animadas y agrupado por carpeta o por fecha. */
export function useHistoryList(): HistoryListModel {
  const { history } = usePorts()
  const [mode, setModeState] = useState(loadMode)
  const setMode = (next: HistoryGroupMode): void => {
    setModeState(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // Sin almacenamiento la elección vale solo para esta sesión.
    }
  }
  const entries = history.useEntries()
  const selectedId = history.useSelectedId()
  const unseen = history.useUnseen()
  const filter = history.useFilter()
  const textMatches = history.useTextMatches()

  const filtered = useMemo(
    () => filterHistory(entries, filter, textMatches),
    [entries, filter, textMatches]
  )
  // Las entradas quitadas siguen en su grupo mientras dura su animación de salida.
  const shown = history.useExiting(filtered)
  const groups = useMemo(() => {
    if (mode === 'folder') return groupHistoryByFolder(shown.items)
    if (mode === 'app') return groupHistoryByApp(shown.items)
    return groupHistory(shown.items)
  }, [mode, shown.items])
  const visibleIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered])

  return {
    entries,
    selectedId,
    unseen,
    filter,
    filtered,
    visibleIds,
    mode,
    setMode,
    groups,
    exiting: shown.exiting
  }
}
