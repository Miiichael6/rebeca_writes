import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { SpeakerSettingsPorts } from '../application/ports'

/** Adaptadores sobre el store de ajustes y el API del preload. */
export const storePorts: SpeakerSettingsPorts = {
  settings: {
    useDetectSpeakers: () => useSettingsStore((s) => s.settings.detectSpeakers),
    setDetectSpeakers: (detectSpeakers) => updateSettings({ detectSpeakers })
  },
  model: {
    prepare: () => window.api.speakers.prepareModel()
  }
}
