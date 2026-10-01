import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { ShortcutSettingsPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre `window.api` y el store de ajustes. Es el único sitio de la
 * sección que los conoce.
 */
export const storePorts: ShortcutSettingsPorts = {
  settings: {
    useShortcut: () => useSettingsStore((s) => s.settings.recordShortcut),
    setShortcut: (recordShortcut) => updateSettings({ recordShortcut })
  },
  hotkey: {
    getStatus: () => window.api.hotkey.getStatus(),
    onStatus: (listener) => window.api.hotkey.onStatus(listener),
    setPaused: (paused) => window.api.hotkey.setPaused(paused)
  }
}
