import { useShallow } from 'zustand/react/shallow'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { TranscriptionOptionsPorts } from '../application/ports'

/** Adaptadores de los puertos sobre el store de ajustes y el navegador. */
export const storePorts: TranscriptionOptionsPorts = {
  options: {
    useValues: () =>
      useSettingsStore(
        useShallow((s) => ({
          maxLen: s.settings.maxLen,
          suppressNst: s.settings.suppressNst,
          normalize: s.settings.normalize,
          threads: s.settings.threads,
          promptEnabled: s.settings.promptEnabled,
          prompt: s.settings.prompt
        }))
      ),
    update: (patch) => updateSettings(patch)
  },
  hardware: {
    cores: () => navigator.hardwareConcurrency || 1
  }
}
