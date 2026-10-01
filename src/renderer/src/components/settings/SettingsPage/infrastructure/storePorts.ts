import { useUiStore } from '@renderer/store/ui'
import type { SettingsPagePorts } from '../application/ports'

/** Adaptadores de los puertos sobre el store de UI. Es el único sitio que lo conoce. */
export const storePorts: SettingsPagePorts = {
  navigation: { backToMain: () => useUiStore.getState().setView('main') }
}
