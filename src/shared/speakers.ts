/**
 * Ids de hablante (tarea 35). `you` es quien graba por su micrófono en *Ambos* (D14); los demás
 * son `p1`, `p2`… por orden de aparición. Los nombres por defecto ("Usted", "Persona 1") los pone
 * la interfaz en su idioma; en el historial solo se guardan los que el usuario cambió.
 */

export const OWN_SPEAKER_ID = 'you'
/** Sonidos que no son voz (música, ruido, una puerta…): no cuentan como una persona. */
export const AMBIENT_SPEAKER_ID = 'ambient'
const PERSON_PREFIX = 'p'
/**
 * Texto sin palabras: solo marcas entre corchetes, paréntesis o asteriscos (`[MÚSICA]`,
 * `(puerta)`, `*aplausos*`, `[BLANK_AUDIO]`) o símbolos musicales. Es lo que whisper escribe
 * cuando oye algo que no es habla.
 */
const NON_SPEECH_RE = /^(?:\s*(?:\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|[♪♫♬🎵🎶]+))+\s*$/u

export function isNonSpeechText(text: string): boolean {
  const trimmed = text.trim()
  return NON_SPEECH_RE.test(trimmed) || !/[\p{L}\p{N}]/u.test(trimmed)
}
const PERSON_ID_RE = new RegExp(`^${PERSON_PREFIX}(\\d+)$`)
/** Largo máximo de un nombre de hablante. */
export const SPEAKER_NAME_MAX = 60

export function personId(index: number): string {
  return `${PERSON_PREFIX}${index}`
}

/** El número de `p3` (3), o `null` si el id no es de una persona. */
export function personNumber(id: string): number | null {
  const match = PERSON_ID_RE.exec(id)
  return match ? Number(match[1]) : null
}

/** ¿Algún segmento tiene hablante? */
export function hasSpeakers(segments: readonly { speaker?: string }[]): boolean {
  return segments.some((s) => s.speaker !== undefined)
}

/** Nombres mostrados de los hablantes, por id. */
export type SpeakerNames = Readonly<Record<string, string>>

/** `"Ana: "` delante del texto de un hablante con nombre; `''` si no lo tiene. */
export function speakerPrefix(
  speaker: string | undefined,
  names: SpeakerNames | undefined
): string {
  const name = speaker && names?.[speaker]
  return name ? `${name}: ` : ''
}
