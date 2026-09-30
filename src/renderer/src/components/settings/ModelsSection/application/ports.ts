import { createContext, useContext } from 'react'
import type { ModelActionResult, ModelProgress, ModelStatus } from '@shared/models'

/** Puerto de salida: los modelos Whisper y sus descargas. */
export interface ModelsPort {
  useModels(): ModelStatus[]
  /** Progreso de la descarga en curso del modelo, si la hay. */
  useProgress(id: string): ModelProgress | undefined
  download(id: string): Promise<void>
  cancel(id: string): void
  remove(id: string): Promise<void>
  addCustom(path: string, name: string): Promise<ModelActionResult>
  /** Abre el selector de archivos; `null` si se cancela. */
  pickCustomFile(): Promise<string | null>
}

export interface ModelsSectionPorts {
  models: ModelsPort
}

export const PortsContext = createContext<ModelsSectionPorts | null>(null)

export function usePorts(): ModelsSectionPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('ModelsSection necesita un PortsContext.Provider')
  return ports
}
