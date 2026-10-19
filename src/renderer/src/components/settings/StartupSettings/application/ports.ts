import { createContext, useContext } from 'react'

/** Puerto de salida: el ajuste de iniciar con Windows (tarea 40). */
export interface SettingsPort {
  useOpenAtLogin(): boolean
  setOpenAtLogin(enabled: boolean): void
}

export interface StartupSettingsPorts {
  settings: SettingsPort
}

export const PortsContext = createContext<StartupSettingsPorts | null>(null)

export function usePorts(): StartupSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('StartupSettings necesita un PortsContext.Provider')
  return ports
}
