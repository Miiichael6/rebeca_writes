/** Modelos oficiales (spec §2.2). `id` es el sufijo de `ggml-<id>.bin`. */
export const WHISPER_MODELS = [
  { id: 'tiny', label: 'Tiny' },
  { id: 'base', label: 'Base' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large-v3-turbo', label: 'Large v3 turbo' },
  { id: 'large-v3', label: 'Large v3' }
] as const

/** Idioma "detectar automáticamente" en `whisper-cli -l`. */
export const AUTO_LANGUAGE = 'auto'

/**
 * Códigos de idioma que acepta whisper.cpp (`-l`), en el orden de whisper. El nombre visible
 * se saca con `Intl.DisplayNames` en el idioma de la interfaz.
 */
export const WHISPER_LANGUAGES = [
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl', 'ar', 'sv',
  'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no',
  'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy', 'sk', 'te', 'fa', 'lv', 'bn', 'sr',
  'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw',
  'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu',
  'am', 'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl',
  'mg', 'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su', 'yue'
] // prettier-ignore

/** whisper usa `jw` para javanés; el código BCP 47 es `jv`. */
export function languageTag(code: string): string {
  return code === 'jw' ? 'jv' : code
}
