/**
 * whisper.cpp solo usa los últimos `n_text_ctx / 2` tokens del prompt inicial (224); lo que
 * sobra se descarta por el principio.
 */
export const PROMPT_MAX_TOKENS = 224

/** Longitud máxima de segmento en caracteres; 0 = sin límite. */
export const MAX_LEN_MIN = 0
export const MAX_LEN_MAX = 10_000

/** Estimación de tokens (~4 caracteres por token). Suficiente para avisar, no es exacta. */
export function approxTokens(text: string): number {
  return Math.ceil(text.trim().length / 4)
}

export function isPromptTooLong(tokens: number): boolean {
  return tokens > PROMPT_MAX_TOKENS
}
