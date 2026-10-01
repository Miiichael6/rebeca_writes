import { createContext, useContext } from 'react'
import type { DockPosition } from '@shared/dock'

/** Puerto de salida: el ajuste de la posición del dock (tarea 33). */
export interface SettingsPort {
  useDockPosition(): DockPosition
  setDockPosition(position: DockPosition): void
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
