import { useBackendStore } from '@renderer/store/backend'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { BackendSettingPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio de la sección que
 * los conoce.
 */
export const storePorts: BackendSettingPorts = {
  backend: {
    useInfo: () => useBackendStore((s) => s.info),
    useCuda: () => useBackendStore((s) => s.cuda),
    useCudaProgress: () => useBackendStore((s) => s.progress),
    downloadCuda: () => useBackendStore.getState().downloadCuda(),
    cancelCuda: () => useBackendStore.getState().cancelCuda(),
    removeCuda: () => useBackendStore.getState().removeCuda()
  },
  settings: {
    useChosen: () => useSettingsStore((s) => s.settings.backend),
    choose: (backend) => updateSettings({ backend })
  }
}
