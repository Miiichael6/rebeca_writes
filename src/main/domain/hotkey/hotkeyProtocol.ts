import { isRecord } from '../guards'
import type { HotkeyCombo } from './accelerator'

/** Mensajes de `rl-hotkey.exe` (tarea 31); el protocolo está en `native/PROTOCOL.md`. */

export type HotkeyCommand = ({ cmd: 'watch' } & HotkeyCombo) | { cmd: 'off' }

export type HotkeySidecarEvent =
  | { type: 'watching' | 'off' | 'down' | 'up' | 'other' }
  | { type: 'error'; code: string; message: string }

const SIMPLE_EVENTS = ['watching', 'off', 'down', 'up', 'other'] as const

export function hotkeyCommand(combo: HotkeyCombo | null): HotkeyCommand {
  return combo ? { cmd: 'watch', ...combo } : { cmd: 'off' }
}

/** Una línea de stderr, o `null` si no es un evento conocido. */
export function parseHotkeyEvent(line: string): HotkeySidecarEvent | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  const type = raw.type
  if (SIMPLE_EVENTS.includes(type as (typeof SIMPLE_EVENTS)[number]))
    return { type: type as (typeof SIMPLE_EVENTS)[number] }
  if (type === 'error') return { type, code: String(raw.code), message: String(raw.message) }
  return null
}
