import { createContext, useContext } from 'react'
import type { QueueSettings } from '@shared/settings'
import type { QueueAddResult, QueueJob } from '@shared/types'
import type { ExitingList } from '@renderer/lib/listExit'

/** Puerto de salida: la cola de transcripción (vive en el main). */
export interface QueuePort {
  useJobs(): QueueJob[]
  usePaused(): boolean
  /** Hay trabajos guardados de la sesión anterior esperando decisión. */
  useResumePending(): boolean
  /** Mantiene en la lista, durante su animación de salida, lo que ya se quitó. */
  useExiting(jobs: readonly QueueJob[]): ExitingList<QueueJob>
  /** Abre el selector de archivos y agrega lo elegido. */
  pickFiles(): Promise<QueueAddResult>
  announceAdded(result: QueueAddResult): void
  remove(id: string): Promise<void>
  reorder(ids: string[]): void
  pause(): Promise<void>
  resume(): Promise<void>
  discard(): Promise<void>
  cancelCurrent(): Promise<void>
  clearCompleted(): Promise<void>
}

export interface ModelLabel {
  id: string
  label: string
}

export interface ModelsPort {
  useModels(): ModelLabel[]
}

export interface QueueSettingsPort {
  useOptions(): QueueSettings
  setOptions(patch: Partial<QueueSettings>): void
}

/** Puerto de salida: abrir en la pantalla principal el resultado de un trabajo. */
export interface HistoryPort {
  /** `false` si no hay nada que abrir todavía. */
  openJob(id: string): Promise<boolean>
}

/** Puerto de salida: el panel lateral y la pantalla que hay detrás. */
export interface PanelPort {
  useOpen(): boolean
  setOpen(open: boolean): void
  showMain(): void
}

export interface QueuePanelPorts {
  queue: QueuePort
  models: ModelsPort
  settings: QueueSettingsPort
  history: HistoryPort
  panel: PanelPort
}

export const PortsContext = createContext<QueuePanelPorts | null>(null)

export function usePorts(): QueuePanelPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('QueuePanel necesita un PortsContext.Provider')
  return ports
}
