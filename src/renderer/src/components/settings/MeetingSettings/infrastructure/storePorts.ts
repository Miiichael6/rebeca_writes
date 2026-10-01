import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { MeetingSettingsPorts } from '../application/ports'

/** Adaptador del puerto sobre el store de ajustes. Es el único sitio de la sección que lo conoce. */
export const storePorts: MeetingSettingsPorts = {
  settings: {
    useSuggestMeetings: () => useSettingsStore((s) => s.settings.suggestMeetingRecording),
    setSuggestMeetings: (suggestMeetingRecording) => updateSettings({ suggestMeetingRecording })
  }
}
