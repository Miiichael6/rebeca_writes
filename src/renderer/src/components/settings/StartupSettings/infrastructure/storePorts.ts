import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { StartupSettingsPorts } from '../application/ports'

/** Adaptador del puerto sobre el store de ajustes. Es el único sitio de la sección que lo conoce. */
export const storePorts: StartupSettingsPorts = {
  settings: {
    useOpenAtLogin: () => useSettingsStore((s) => s.settings.openAtLogin),
    setOpenAtLogin: (openAtLogin) => updateSettings({ openAtLogin })
  }
}
