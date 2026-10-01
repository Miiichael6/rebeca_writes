import { createContext, useContext } from 'react'

/** Puerto de salida: la navegación entre la pantalla principal y Configuración. */
export interface NavigationPort {
  backToMain(): void
}

export interface SettingsPagePorts {
  navigation: NavigationPort
}

export const PortsContext = createContext<SettingsPagePorts | null>(null)

export function usePorts(): SettingsPagePorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('SettingsPage necesita un PortsContext.Provider')
  return ports
}
