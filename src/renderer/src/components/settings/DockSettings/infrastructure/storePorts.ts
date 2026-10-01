import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { DockSettingsPorts } from '../application/ports'

/** Adaptador del puerto sobre el store de ajustes. Es el único sitio de la sección que lo conoce. */
export const storePorts: DockSettingsPorts = {
  settings: {
    useDockPosition: () => useSettingsStore((s) => s.settings.dockPosition),
    setDockPosition: (dockPosition) => updateSettings({ dockPosition })
  }
}
