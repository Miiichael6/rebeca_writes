import { createContext, useContext } from 'react'
import type { UpdateStatus } from '@shared/types'

/** Puerto de salida: el actualizador de la app. */
export interface UpdatesPort {
  useStatus(): UpdateStatus
  download(): Promise<void>
  install(): Promise<void>
}

export interface UpdateButtonPorts {
  updates: UpdatesPort
}

export const PortsContext = createContext<UpdateButtonPorts | null>(null)

export function usePorts(): UpdateButtonPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('UpdateButton necesita un PortsContext.Provider')
  return ports
}
