import { createContext, useContext } from 'react'
import type { DockPosition } from '@shared/dock'

/** Puerto de salida: la posición del dock (tarea 33) y si se esconde a pantalla completa (40). */
export interface SettingsPort {
  useDockPosition(): DockPosition
  setDockPosition(position: DockPosition): void
  useHideInFullscreen(): boolean
  setHideInFullscreen(enabled: boolean): void
}

export interface DockSettingsPorts {
  settings: SettingsPort
}

export const PortsContext = createContext<DockSettingsPorts | null>(null)

export function usePorts(): DockSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('DockSettings necesita un PortsContext.Provider')
  return ports
}
