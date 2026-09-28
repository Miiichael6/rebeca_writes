import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_UI_LANGUAGE,
  matchUiLanguage,
  type UiLanguage,
  type UiLanguageSetting
} from '@shared/i18n'
import en from './locales/en.json'
import es from './locales/es.json'
import ptBR from './locales/pt-BR.json'

/** Un archivo por idioma de `SUPPORTED_UI_LANGUAGES`; si falta uno, no compila. */
export const resources = {
  es: { translation: es },
  en: { translation: en },
  'pt-BR': { translation: ptBR }
} satisfies Record<UiLanguage, { translation: object }>

/** Idiomas preferidos de Windows; se leen una vez al arrancar. */
let systemLanguages: readonly string[] = []

/** Idioma concreto que corresponde a lo que eligió el usuario. */
export function resolveUiLanguage(setting: UiLanguageSetting): UiLanguage {
  return setting === 'system' ? matchUiLanguage(systemLanguages) : setting
}

/** Se espera antes del primer render para no pintar la interfaz en el idioma equivocado. */
export async function initI18n(setting: UiLanguageSetting): Promise<void> {
  systemLanguages = await window.api.app.getPreferredLanguages().catch(() => navigator.languages)

  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng
  })

  await i18n.use(initReactI18next).init({
    resources,
    lng: resolveUiLanguage(setting),
    fallbackLng: DEFAULT_UI_LANGUAGE,
    // React ya escapa lo que pinta.
    interpolation: { escapeValue: false }
  })
}

export default i18n
