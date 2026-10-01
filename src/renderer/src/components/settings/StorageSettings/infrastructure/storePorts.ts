import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import type { StorageSettingsPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre `window.api` y los stores de Zustand. Es el único sitio
 * de la sección que los conoce.
 */
export const storePorts: StorageSettingsPorts = {
  storage: {
    getModelsDir: () => window.api.app.getModelsDir(),
    openModelsDir: () => window.api.app.openModelsDir(),
    getRecordingsDir: () => window.api.mic.getRecordingsDir(),
    pickRecordingsDir: () => window.api.mic.pickRecordingsDir(),
    openRecordingsDir: () => window.api.mic.openRecordingsDir(),
    getPreviewCacheSize: () => window.api.media.getPreviewCacheSize(),
    clearPreviewCache: () => window.api.media.clearPreviewCache()
  },
  settings: {
    useCacheLimitGB: () => useSettingsStore((s) => s.settings.previewCacheMaxGB),
    setCacheLimitGB: (gb) => updateSettings({ previewCacheMaxGB: gb })
  },
  notify: { notify: (message) => toast(message) }
}
