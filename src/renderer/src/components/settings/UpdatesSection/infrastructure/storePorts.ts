import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useUpdatesStore } from '@renderer/store/updates'
import type { UpdatesSectionPorts } from '../application/ports'

/** Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio que los conoce. */
export const storePorts: UpdatesSectionPorts = {
  updates: {
    useStatus: () => useUpdatesStore((s) => s.status),
    check: () => useUpdatesStore.getState().check(),
    download: () => useUpdatesStore.getState().download(),
    install: () => useUpdatesStore.getState().install()
  },
  settings: {
    useAutoCheck: () => useSettingsStore((s) => s.settings.autoCheckUpdates),
    setAutoCheck: (autoCheckUpdates) => updateSettings({ autoCheckUpdates })
  }
}
