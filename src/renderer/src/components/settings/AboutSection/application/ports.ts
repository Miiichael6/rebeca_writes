import { createContext, useContext } from 'react'

/** Puerto de salida: datos de la app. */
export interface AppPort {
  /** Vacía hasta que llega del main. */
  useVersion(): string
  openLogs(): void
}

export interface AboutSectionPorts {
  app: AppPort
}

export const PortsContext = createContext<AboutSectionPorts | null>(null)

export function usePorts(): AboutSectionPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('AboutSection necesita un PortsContext.Provider')
  return ports
}
