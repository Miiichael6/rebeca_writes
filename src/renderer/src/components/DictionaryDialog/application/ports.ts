import { createContext, useContext } from 'react'
import type {
  DictionaryEntry,
  DictionaryFileFormat,
  DictionaryImportedFile
} from '@shared/dictionary'

/** Puerto de salida: el diccionario guardado en el main y sus archivos. */
export interface DictionaryPort {
  load(): Promise<DictionaryEntry[]>
  save(entries: DictionaryEntry[]): Promise<DictionaryEntry[]>
  /** Diálogo para elegir un `.json` o `.csv`; `null` si se cancela. */
  importFile(): Promise<DictionaryImportedFile | null>
  /** "Guardar como"; devuelve la ruta o `null` si se cancela. */
  exportFile(
    content: string,
    format: DictionaryFileFormat,
    filterLabel: string
  ): Promise<string | null>
}

/** Puerto de salida: si el diálogo está abierto (lo abren el menú rápido y Configuración). */
export interface VisibilityPort {
  useOpen(): boolean
  close(): void
}

/** Puerto de salida: avisos y ids. */
export interface FeedbackPort {
  toast(message: string): void
  createId(): string
}

export interface DictionaryDialogPorts {
  dictionary: DictionaryPort
  visibility: VisibilityPort
  feedback: FeedbackPort
}

export const PortsContext = createContext<DictionaryDialogPorts | null>(null)

export function usePorts(): DictionaryDialogPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('DictionaryDialog necesita un PortsContext.Provider')
  return ports
}
