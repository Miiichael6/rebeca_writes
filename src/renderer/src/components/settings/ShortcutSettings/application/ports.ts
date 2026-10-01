import { createContext, useContext } from 'react'
import type { HotkeyStatus } from '@shared/shortcut'

/** Puerto de salida: el atajo guardado en ajustes (`null` = desactivado). */
export interface SettingsPort {
  useShortcut(): string | null
  setShortcut(shortcut: string | null): void
}

/** Puerto de salida: el atajo que vigila el main. */
export interface HotkeyPort {
  getStatus(): Promise<HotkeyStatus>
  onStatus(listener: (status: HotkeyStatus) => void): () => void
  /** Mientras se captura uno nuevo, pulsar el actual no graba. */
  setPaused(paused: boolean): Promise<void>
}

export interface ShortcutSettingsPorts {
  settings: SettingsPort
  hotkey: HotkeyPort
}

export const PortsContext = createContext<ShortcutSettingsPorts | null>(null)

export function usePorts(): ShortcutSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('ShortcutSettings necesita un PortsContext.Provider')
  return ports
}
