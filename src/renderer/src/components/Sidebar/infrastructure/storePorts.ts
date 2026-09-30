import { useListExit } from '@renderer/lib/useListExit'
import { useHistoryStore } from '@renderer/store/history'
import { selectPendingCount, useQueueStore } from '@renderer/store/queue'
import { toast } from '@renderer/store/toast'
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  useUiStore
} from '@renderer/store/ui'
import { entryKey } from '../domain/entry'
import type { SidebarPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio del menú lateral
 * que los conoce. Las acciones se leen con `getState()` en cada llamada: no cambian, pero así
 * no hay que enlazarlas al montar.
 */
export const storePorts: SidebarPorts = {
  history: {
    useEntries: () => useHistoryStore((s) => s.entries),
    useSelectedId: () => useHistoryStore((s) => s.selectedId),
    useFilter: () => useHistoryStore((s) => s.filter),
    useTextMatches: () => useHistoryStore((s) => s.textMatches),
    useExiting: (entries) => useListExit(entries, entryKey),
    select: (id) => useHistoryStore.getState().select(id),
    setFilter: (filter) => useHistoryStore.getState().setFilter(filter),
    openFile: () => useHistoryStore.getState().openFile(),
    rename: (id, name) => useHistoryStore.getState().rename(id, name),
    remove: (id) => useHistoryStore.getState().remove(id),
    clear: () => useHistoryStore.getState().clear(),
    hasEdits: (id) => useHistoryStore.getState().hasEdits(id),
    retranscribe: (id) => useHistoryStore.getState().retranscribe(id),
    showInFolder: (id) => useHistoryStore.getState().showInFolder(id)
  },
  queue: {
    usePendingCount: () => useQueueStore(selectPendingCount),
    openPanel: () => useUiStore.getState().setQueueOpen(true)
  },
  layout: {
    useCollapsed: () => useUiStore((s) => s.sidebarCollapsed),
    toggleCollapsed: () => useUiStore.getState().toggleSidebar(),
    useWidth: () => useUiStore((s) => s.sidebarWidth),
    currentWidth: () => useUiStore.getState().sidebarWidth,
    setWidth: (width, persist) => useUiStore.getState().setSidebarWidth(width, persist),
    limits: { min: SIDEBAR_WIDTH_MIN, max: SIDEBAR_WIDTH_MAX, default: SIDEBAR_WIDTH_DEFAULT }
  },
  notifier: {
    notify: (message) => toast(message)
  }
}
