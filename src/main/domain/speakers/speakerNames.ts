import { isRecord } from '../guards'

/** Los ids de hablante son cortos y sin rarezas (`you`, `p12`). */
const SPEAKER_ID_RE = /^[\w-]{1,32}$/

/**
 * El mapa de nombres tras renombrar `speakerId` (tarea 35). El nombre se recorta a `maxLength`;
 * vacío quita la entrada (vuelve el nombre por defecto) y un mapa vacío queda `undefined`. Un id
 * inválido deja el mapa como estaba.
 */
export function renamedSpeakers(
  current: Readonly<Record<string, string>> | undefined,
  speakerId: string,
  name: string,
  maxLength: number
): Record<string, string> | undefined {
  if (!SPEAKER_ID_RE.test(speakerId)) return current && { ...current }
  const next = { ...current }
  const trimmed = name.trim().slice(0, maxLength)
  if (trimmed) next[speakerId] = trimmed
  else delete next[speakerId]
  return Object.keys(next).length > 0 ? next : undefined
}

/** ¿Es un mapa id → nombre? Viene del disco o del renderer. */
export function isSpeakerNames(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((name) => typeof name === 'string')
}
