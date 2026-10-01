import { createContext, useContext } from 'react'
import type { UpdateStatus } from '@shared/types'

/** Puerto de salida: el actualizador de la app. */
export interface UpdatesPort {
  useStatus(): UpdateStatus
  check(): Promise<void>
  download(): Promise<void>
  install(): Promise<void>
}

export interface SettingsPort {
  useAutoCheck(): boolean
  setAutoCheck(value: boolean): void
}

export interface UpdatesSectionPorts {
  updates: UpdatesPort
  settings: SettingsPort
}

export const PortsContext = createContext<UpdatesSectionPorts | null>(null)

export function usePorts(): UpdatesSectionPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('UpdatesSection necesita un PortsContext.Provider')
  return ports
}
