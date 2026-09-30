import { createContext, useContext } from 'react'

export interface TranscriptionOptionsValues {
  maxLen: number
  suppressNst: boolean
  normalize: boolean
  threads: number
  promptEnabled: boolean
  prompt: string
}

/** Puerto de salida: las opciones de transcripción guardadas en los ajustes. */
export interface OptionsPort {
  useValues(): TranscriptionOptionsValues
  update(patch: Partial<TranscriptionOptionsValues>): void
}

/** Puerto de salida: el hardware, para acotar los hilos. */
export interface HardwarePort {
  cores(): number
}

export interface TranscriptionOptionsPorts {
  options: OptionsPort
  hardware: HardwarePort
}

export const PortsContext = createContext<TranscriptionOptionsPorts | null>(null)

export function usePorts(): TranscriptionOptionsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('TranscriptionOptions necesita un PortsContext.Provider')
  return ports
}
