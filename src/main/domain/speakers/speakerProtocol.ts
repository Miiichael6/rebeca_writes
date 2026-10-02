import { isRecord } from '../guards'

/** Mensajes de `rl-speaker.exe` (tarea 35); el protocolo está en `native/PROTOCOL.md`. */

export type SpeakerCommand =
  | { cmd: 'load'; model: string; threads: number }
  | { cmd: 'embed'; id: number; wav: string; start: number; end: number }

export type SpeakerEvent =
  | { type: 'loaded'; dim: number }
  | { type: 'loadFailed'; message: string }
  | { type: 'embedding'; id: number; vector: number[] }
  | { type: 'embedFailed'; id: number; message: string }
  | { type: 'error'; code: string; message: string }

/** Una línea de stderr, o `null` si no es un evento conocido. */
export function parseSpeakerEvent(line: string): SpeakerEvent | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  switch (raw.type) {
    case 'loaded':
      return typeof raw.dim === 'number' ? { type: 'loaded', dim: raw.dim } : null
    case 'load_failed':
      return { type: 'loadFailed', message: String(raw.message) }
    case 'embedding':
      return typeof raw.id === 'number' &&
        Array.isArray(raw.vector) &&
        raw.vector.every((value) => typeof value === 'number')
        ? { type: 'embedding', id: raw.id, vector: raw.vector }
        : null
    case 'embed_failed':
      return typeof raw.id === 'number'
        ? { type: 'embedFailed', id: raw.id, message: String(raw.message) }
        : null
    case 'error':
      return { type: 'error', code: String(raw.code), message: String(raw.message) }
    default:
      return null
  }
}
