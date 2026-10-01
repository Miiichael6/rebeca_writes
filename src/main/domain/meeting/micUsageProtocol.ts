import { isRecord } from '../guards'

/** Mensajes de `rl-calls.exe` (tarea 32); el protocolo está en `native/PROTOCOL.md`. */

/** `micUsers`: claves del registro de las apps que tienen el micrófono abierto ahora. */
export type MicUsageEvent =
  { type: 'micUsers'; apps: string[] } | { type: 'error'; code: string; message: string }

/** Una línea de stderr, o `null` si no es un evento conocido. */
export function parseMicUsageEvent(line: string): MicUsageEvent | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  if (raw.type === 'mic_users' && Array.isArray(raw.apps))
    return { type: 'micUsers', apps: raw.apps.filter((app) => typeof app === 'string') }
  if (raw.type === 'error')
    return { type: 'error', code: String(raw.code), message: String(raw.message) }
  return null
}
