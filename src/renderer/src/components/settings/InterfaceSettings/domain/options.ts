import { SUPPORTED_UI_LANGUAGES, type UiLanguageSetting } from '@shared/i18n'
import type { ThemeMode } from '@shared/theme'

export interface Option<T extends string> {
  value: T
  label: string
}

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']

export function themeOptions(label: (mode: ThemeMode) => string): Option<ThemeMode>[] {
  return THEME_MODES.map((value) => ({ value, label: label(value) }))
}

/** Cada idioma con su nombre nativo, para que se reconozca aunque la interfaz esté en otro. */
export function languageOptions(systemLabel: string): Option<UiLanguageSetting>[] {
  return [
    { value: 'system', label: systemLabel },
    ...SUPPORTED_UI_LANGUAGES.map((l) => ({ value: l.code, label: l.nativeName }))
  ]
}
