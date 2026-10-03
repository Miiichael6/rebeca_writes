import { createContext, useContext } from 'react'
import type { HistoryEntry, RenameFileFailure } from '@shared/types'
import type { ExitingList } from '@renderer/lib/listExit'

/** Puerto de salida: el historial de transcripciones. */
export interface HistoryPort {
  useEntries(): HistoryEntry[]
  useSelectedId(): string | null
  /** Ids que terminaron de transcribirse sin que el usuario los haya abierto aún. */
  useUnseen(): ReadonlySet<string>
  useFilter(): string
  /** Ids cuya transcripción contiene el filtro, o `null` mientras no hay filtro. */
  useTextMatches(): ReadonlySet<string> | null
  /** Mantiene en la lista, durante su animación de salida, lo que ya se quitó. */
  useExiting(entries: readonly HistoryEntry[]): ExitingList<HistoryEntry>
  select(id: string): void
  setFilter(filter: string): void
  openFile(): Promise<void>
  rename(id: string, displayName: string): Promise<void>
  /** Renombra el archivo original; `null` si salió bien. */
  renameFile(id: string, name: string): Promise<RenameFileFailure | null>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  hasEdits(id: string): Promise<boolean>
  /** `false` si el archivo ya estaba en la cola. */
  retranscribe(id: string): Promise<boolean>
  showInFolder(id: string): Promise<void>
}

export interface QueuePort {
  usePendingCount(): number
  openPanel(): void
}

export interface WidthLimits {
  min: number
  max: number
  default: number
}

/** Puerto de salida: el aspecto del menú lateral (plegado y ancho, que se recuerdan). */
export interface SidebarLayoutPort {
  useCollapsed(): boolean
  toggleCollapsed(): void
  useWidth(): number
  /** Ancho actual, leído en el momento (dentro de un manejador de eventos). */
  currentWidth(): number
  /** `persist: false` mientras se arrastra; se guarda al soltar. */
  setWidth(width: number, persist?: boolean): void
  limits: WidthLimits
}

export interface NotifierPort {
  notify(message: string): void
}

/** Todo lo que el menú lateral necesita del exterior. Los adaptadores lo implementan. */
export interface SidebarPorts {
  history: HistoryPort
  queue: QueuePort
  layout: SidebarLayoutPort
  notifier: NotifierPort
}

export const PortsContext = createContext<SidebarPorts | null>(null)

export function usePorts(): SidebarPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('Sidebar necesita un PortsContext.Provider')
  return ports
}
