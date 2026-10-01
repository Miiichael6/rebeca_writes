import { createContext, useContext } from 'react'
import type { BackendFallback } from '@shared/types'

export type View = 'main' | 'settings'

/** Puerto de salida: sincronización de los stores con el main. Se monta una vez, en la raíz. */
export interface SyncPort {
  useSyncAll(): void
}

/** Puerto de salida: qué pantalla se muestra. */
export interface ViewPort {
  useCurrent(): View
  showMain(): void
}

export interface MainLayout {
  /** El archivo abierto; cambia el reproductor al cambiar de archivo. */
  entryId: string | undefined
  sidebarCollapsed: boolean
  sidebarWidth: number
  /** El video tapa la transcripción. */
  transcriptCovered: boolean
  /** La transcripción vive en una ventanita flotante sobre el video. */
  transcriptFloating: boolean
}

/** Puerto de salida: la disposición de la pantalla principal y sus atajos. */
export interface LayoutPort {
  useMainLayout(): MainLayout
  usePlayerShortcuts(): void
}

/** Puerto de salida: el main avisa de que cayó a otro backend. */
export interface BackendPort {
  onFallback(listener: (fallback: BackendFallback) => void): () => void
}

/** Puerto de salida: abrir archivos de video o audio. */
export interface FilesPort {
  open(): Promise<void>
}

/** Puerto de salida: avisos no bloqueantes. */
export interface NotifyPort {
  notify(message: string, durationMs?: number): void
}

export interface AppPorts {
  sync: SyncPort
  view: ViewPort
  layout: LayoutPort
  backend: BackendPort
  files: FilesPort
  notify: NotifyPort
}

export const PortsContext = createContext<AppPorts | null>(null)

export function usePorts(): AppPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('App necesita un PortsContext.Provider')
  return ports
}
