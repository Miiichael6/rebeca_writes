import { useEffect } from 'react'
import { create } from 'zustand'
import { createDefaultSettings, type Settings, type SettingsPatch } from '@shared/settings'
import i18n, { resolveUiLanguage } from '@renderer/i18n'

/**
 * Copia en el renderer de `settings.json`. El main es la fuente de verdad: valida cada
 * cambio, lo guarda y avisa con `settings:changed`. Aquí el cambio se aplica al momento
 * (para que sliders y toggles respondan sin esperar) y luego se corrige con lo que diga el main.
 */

interface SettingsState {
  settings: Settings
}

export const useSettingsStore = create<SettingsState>()(() => ({
  // Solo hasta `loadSettings()`, que se espera antes del primer render.
  settings: createDefaultSettings(navigator.hardwareConcurrency || 2)
}))

function merge(settings: Settings, patch: SettingsPatch): Settings {
  return {
    ...settings,
    ...patch,
    queue: { ...settings.queue, ...patch.queue },
    window: { ...settings.window, ...patch.window }
  }
}

/** Cambios enviados al main que aún no respondieron. */
let pending = 0
/** Número del último cambio enviado: solo su respuesta pisa el estado local. */
let lastRequest = 0

function apply(settings: Settings): void {
  useSettingsStore.setState({ settings })
}

/** Cambia uno o más settings y los guarda (en el main, con debounce). */
export function updateSettings(patch: SettingsPatch): void {
  useSettingsStore.setState((s) => ({ settings: merge(s.settings, patch) }))
  const request = ++lastRequest
  pending++
  window.api.settings
    .set(patch)
    .then((settings) => {
      if (request === lastRequest) apply(settings)
    })
    .catch((err) => console.error('No se pudieron guardar los settings', err))
    .finally(() => pending--)
}

/** Lee los settings guardados. Se espera antes del primer render. */
export async function loadSettings(): Promise<Settings> {
  const settings = await window.api.settings.get()
  apply(settings)
  return settings
}

// El idioma de la interfaz se aplica en cuanto cambia; react-i18next repinta lo que usa `t`.
useSettingsStore.subscribe((state, prev) => {
  const { uiLanguage } = state.settings
  if (uiLanguage !== prev.settings.uiLanguage && i18n.isInitialized) {
    i18n.changeLanguage(resolveUiLanguage(uiLanguage))
  }
})

/**
 * Escucha los cambios que llegan del main (p. ej. el backend autodetectado o el tamaño de la
 * ventana). Mientras haya cambios propios en vuelo se ignoran, para no deshacerlos.
 */
export function useSettingsSync(): void {
  useEffect(
    () =>
      window.api.settings.onChanged((settings) => {
        if (pending === 0) apply(settings)
      }),
    []
  )
}
