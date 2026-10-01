import { useShallow } from 'zustand/react/shallow'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import type { InterfaceSettingsPorts } from '../application/ports'

/** Adaptadores de los puertos sobre el store de ajustes. Es el único sitio que lo conoce. */
export const storePorts: InterfaceSettingsPorts = {
  settings: {
    useInterface: () =>
      useSettingsStore(
        useShallow((s) => ({
          showCaptions: s.settings.showCaptions,
          videoHeight: s.settings.videoHeight,
          theme: s.settings.theme,
          uiLanguage: s.settings.uiLanguage
        }))
      ),
    setShowCaptions: (showCaptions) => updateSettings({ showCaptions }),
    setVideoHeight: (videoHeight) => updateSettings({ videoHeight }),
    setTheme: (theme) => updateSettings({ theme }),
    setUiLanguage: (uiLanguage) => updateSettings({ uiLanguage })
  }
}
