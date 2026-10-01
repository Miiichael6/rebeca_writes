import {
  formatShortcut,
  parseShortcut,
  SHORTCUT_MODIFIERS,
  type ShortcutError,
  type ShortcutModifier
} from '@shared/shortcut'

/** Lo que se lee de cada `KeyboardEvent` mientras se captura el atajo. */
export interface CaptureKey {
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

/** La combinación más completa pulsada desde que empezó la captura. */
export interface CaptureState {
  modifiers: ShortcutModifier[]
  key: string | null
}

export const EMPTY_CAPTURE: CaptureState = { modifiers: [], key: null }

const LETTER_CODE = /^Key([A-Z])$/
const DIGIT_CODE = /^Digit([0-9])$/
const FUNCTION_CODE = /^F([1-9]|1[0-9]|2[0-4])$/

/** La tecla que no es modificador, como la escribe `@shared/shortcut`; `null` si no se admite. */
export function shortcutKey(code: string): string | null {
  const match = LETTER_CODE.exec(code) ?? DIGIT_CODE.exec(code)
  if (match) return match[1]
  if (FUNCTION_CODE.test(code)) return code
  return code === 'Space' ? 'Space' : null
}

function heldModifiers(event: CaptureKey): ShortcutModifier[] {
  const held: Record<ShortcutModifier, boolean> = {
    Ctrl: event.ctrlKey,
    Alt: event.altKey,
    Shift: event.shiftKey,
    Super: event.metaKey
  }
  return SHORTCUT_MODIFIERS.filter((m) => held[m])
}

/** Suma una tecla pulsada a lo capturado (lo que se suelta no quita nada). */
export function pressKey(state: CaptureState, event: CaptureKey): CaptureState {
  const held = heldModifiers(event)
  const modifiers = SHORTCUT_MODIFIERS.filter(
    (m) => state.modifiers.includes(m) || held.includes(m)
  )
  return { modifiers, key: shortcutKey(event.code) ?? state.key }
}

/** Al soltar: la captura termina cuando se pulsó algo y ya no queda ningún modificador. */
export function captureDone(state: CaptureState, event: CaptureKey): boolean {
  const pressedSomething = state.modifiers.length > 0 || state.key !== null
  return pressedSomething && heldModifiers(event).length === 0
}

export type CaptureResult = { ok: true; shortcut: string } | { ok: false; error: ShortcutError }

/** Lo capturado como el texto que se guarda, o por qué no vale. */
export function captureResult(state: CaptureState): CaptureResult {
  const parsed = parseShortcut(formatShortcut(state))
  return parsed.ok ? { ok: true, shortcut: formatShortcut(parsed.shortcut) } : parsed
}
