import { createContext, useContext } from 'react'
import type { ModelDownloadResult } from '@shared/models'

/** Puerto de salida: el ajuste "Detectar quién habla" (tarea 35). */
export interface SettingsPort {
  useDetectSpeakers(): boolean
  setDetectSpeakers(enabled: boolean): void
}

/** Puerto de salida: el modelo de voces que necesita el ajuste. */
export interface SpeakerModelPort {
  /** Lo descarga si falta; si ya está, termina enseguida. */
  prepare(): Promise<ModelDownloadResult>
}

export interface SpeakerSettingsPorts {
  settings: SettingsPort
  model: SpeakerModelPort
}

export const PortsContext = createContext<SpeakerSettingsPorts | null>(null)

export function usePorts(): SpeakerSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('SpeakerSettings necesita un PortsContext.Provider')
  return ports
}
