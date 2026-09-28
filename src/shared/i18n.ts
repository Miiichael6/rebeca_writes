/**
 * Idiomas de la interfaz. Para añadir uno: una entrada aquí y su archivo
 * `src/renderer/src/i18n/locales/<code>.json` (registrado en `i18n/index.ts`).
 */
export const SUPPORTED_UI_LANGUAGES = [
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' }
] as const

export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number]['code']

/** Lo que elige el usuario: un idioma concreto o `system` (el de Windows). */
export type UiLanguageSetting = UiLanguage | 'system'

/** Idioma de reserva cuando Windows usa uno que no tenemos. */
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'es'

const baseOf = (tag: string): string => tag.toLowerCase().split('-')[0]

/**
 * Idioma soportado más cercano a la lista de preferencias del sistema (BCP 47, en orden).
 * Primero busca la etiqueta exacta y luego solo el idioma base (`pt-PT` → `pt-BR`,
 * `en-GB` → `en`), respetando el orden de preferencia. Sin coincidencias, `es`.
 */
export function matchUiLanguage(preferred: readonly string[]): UiLanguage {
  for (const tag of preferred) {
    const exact = SUPPORTED_UI_LANGUAGES.find((l) => l.code.toLowerCase() === tag.toLowerCase())
    if (exact) return exact.code
    const base = SUPPORTED_UI_LANGUAGES.find((l) => baseOf(l.code) === baseOf(tag))
    if (base) return base.code
  }
  return DEFAULT_UI_LANGUAGE
}
