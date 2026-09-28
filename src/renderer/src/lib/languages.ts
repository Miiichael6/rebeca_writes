import { AUTO_LANGUAGE, WHISPER_LANGUAGES, languageTag } from '@shared/whisper'

/**
 * Opciones del combo de idioma: "Detectar automáticamente" primero y después los idiomas de
 * whisper con el nombre en el idioma de la interfaz, ordenados alfabéticamente.
 */
export function whisperLanguageOptions(
  uiLocale: string,
  autoLabel: string
): { value: string; label: string }[] {
  const names = new Intl.DisplayNames([uiLocale], { type: 'language', fallback: 'code' })
  const collator = new Intl.Collator(uiLocale)
  const list = WHISPER_LANGUAGES.map((code) => {
    const name = names.of(languageTag(code)) ?? code
    return { value: code, label: name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1) }
  }).sort((a, b) => collator.compare(a.label, b.label))
  return [{ value: AUTO_LANGUAGE, label: autoLabel }, ...list]
}
