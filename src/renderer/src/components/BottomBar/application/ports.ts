import { createContext, useContext } from 'react'
import type { ExportFormat } from '@shared/exporters'

export interface BottomBarOptions {
  joinLines: boolean
  autoScroll: boolean
}

/** Puerto de salida: opciones de la transcripción, que se recuerdan entre sesiones. */
export interface SettingsPort {
  useOptions(): BottomBarOptions
  setJoinLines(value: boolean): void
  setAutoScroll(value: boolean): void
}

/** Puerto de salida: la transcripción abierta, para copiarla o exportarla. */
export interface TranscriptPort {
  /** `true` si no hay segmentos que copiar ni exportar. */
  useIsEmpty(): boolean
  copy(): void
  exportAs(format: ExportFormat): void
  /**
   * Guarda el `.srt` junto al archivo. Devuelve la ruta del que ya existe cuando hace falta
   * confirmar antes de reemplazarlo; `null` si se guardó o no se pudo.
   */
  saveSrtBeside(overwrite?: boolean): Promise<string | null>
  /** Nombre del archivo de una ruta. */
  fileName(path: string): string
}

export interface BottomBarPorts {
  settings: SettingsPort
  transcript: TranscriptPort
}

export const PortsContext = createContext<BottomBarPorts | null>(null)

export function usePorts(): BottomBarPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('BottomBar necesita un PortsContext.Provider')
  return ports
}
