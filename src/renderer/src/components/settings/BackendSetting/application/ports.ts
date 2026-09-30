import { createContext, useContext } from 'react'
import type { Backend, BackendInfo, CudaPackageStatus, CudaProgress } from '@shared/types'

/** Puerto de salida: los backends de whisper.cpp y el paquete CUDA descargable. */
export interface BackendPort {
  /** `null` hasta que llega la información del main. */
  useInfo(): BackendInfo | null
  useCuda(): CudaPackageStatus | null
  useCudaProgress(): CudaProgress | null
  downloadCuda(): Promise<void>
  cancelCuda(): void
  removeCuda(): Promise<void>
}

export interface SettingsPort {
  /** Backend elegido; `null` hasta la autodetección del primer arranque. */
  useChosen(): Backend | null
  choose(backend: Backend): void
}

export interface BackendSettingPorts {
  backend: BackendPort
  settings: SettingsPort
}

export const PortsContext = createContext<BackendSettingPorts | null>(null)

export function usePorts(): BackendSettingPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('BackendSetting necesita un PortsContext.Provider')
  return ports
}
