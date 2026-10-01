import { createContext, useContext } from 'react'
import type { UiLanguageSetting } from '@shared/i18n'
import type { ThemeMode } from '@shared/theme'

export interface InterfaceChoice {
  showCaptions: boolean
  videoHeight: number
  theme: ThemeMode
  uiLanguage: UiLanguageSetting
}

/** Puerto de salida: los ajustes de interfaz, que se guardan al momento. */
export interface SettingsPort {
  useInterface(): InterfaceChoice
  setShowCaptions(value: boolean): void
  setVideoHeight(value: number): void
  setTheme(value: ThemeMode): void
  setUiLanguage(value: UiLanguageSetting): void
}

export interface InterfaceSettingsPorts {
  settings: SettingsPort
}

export const PortsContext = createContext<InterfaceSettingsPorts | null>(null)

export function usePorts(): InterfaceSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('InterfaceSettings necesita un PortsContext.Provider')
  return ports
}
