import { createContext, useContext } from 'react'

/** Puerto de salida: las carpetas de la app y la caché de vistas previas (H.264). */
export interface StoragePort {
  getModelsDir(): Promise<string>
  openModelsDir(): Promise<void>
  /** Tamaño de la caché de vistas previas, en bytes. */
  getPreviewCacheSize(): Promise<number>
  clearPreviewCache(): Promise<void>
}

/** Puerto de salida: el límite de la caché, que se recuerda entre sesiones. */
export interface SettingsPort {
  useCacheLimitGB(): number
  setCacheLimitGB(gb: number): void
}

/** Puerto de salida: avisos al usuario. */
export interface NotifyPort {
  notify(message: string): void
}

export interface StorageSettingsPorts {
  storage: StoragePort
  settings: SettingsPort
  notify: NotifyPort
}

export const PortsContext = createContext<StorageSettingsPorts | null>(null)

export function usePorts(): StorageSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('StorageSettings necesita un PortsContext.Provider')
  return ports
}
