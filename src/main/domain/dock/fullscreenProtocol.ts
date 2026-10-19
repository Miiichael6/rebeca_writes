import { isRecord } from '../guards'

/** Mensajes de `rl-fullscreen.exe` (tarea 40); el protocolo está en `native/PROTOCOL.md`. */

/** `fullscreen`: la ventana de delante tapa todo el monitor principal (o deja de taparlo). */
export type FullscreenEvent = { type: 'fullscreen'; active: boolean }

/** Una línea de stderr, o `null` si no es un evento conocido. */
export function parseFullscreenEvent(line: string): FullscreenEvent | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  if (raw.type === 'fullscreen' && typeof raw.active === 'boolean')
    return { type: 'fullscreen', active: raw.active }
  return null
}
