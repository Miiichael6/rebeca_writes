/**
 * El atajo de teclado para grabar (tarea 31) guardado como texto: `Ctrl+Super`, `Ctrl+Shift+R`.
 * Lo comparten el main (qué vigila el sidecar) y el renderer (el campo de Configuración).
 */

/** En el orden en que se escriben y se muestran. */
export const SHORTCUT_MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Super'] as const
export type ShortcutModifier = (typeof SHORTCUT_MODIFIERS)[number]

/** D10: mantener Ctrl+Win graba; Ctrl+Win, Win deja grabando en manos libres. */
export const DEFAULT_RECORD_SHORTCUT = 'Ctrl+Super'

export interface Shortcut {
  modifiers: ShortcutModifier[]
  /** La tecla que no es modificador (`A`, `7`, `F9`, `Space`), o `null` si solo hay modificadores. */
  key: string | null
}

/** Por qué una combinación no vale como atajo. */
export type ShortcutError =
  | 'empty'
  | 'noModifier'
  /** Solo modificadores: hace falta al menos dos, o mantener Ctrl para copiar grabaría. */
  | 'needsTwoModifiers'
  | 'repeated'
  | 'unknownKey'
  | 'twoKeys'

export type ShortcutParse = { ok: true; shortcut: Shortcut } | { ok: false; error: ShortcutError }

const MODIFIER_ALIASES: Record<string, ShortcutModifier> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  super: 'Super',
  win: 'Super',
  meta: 'Super'
}

const LETTER_OR_DIGIT = /^[A-Z0-9]$/
const FUNCTION_KEY = /^F([1-9]|1[0-9]|2[0-4])$/

/** La tecla normalizada (`a` → `A`, `space` → `Space`), o `null` si no se admite. */
function normalizeKey(token: string): string | null {
  const upper = token.toUpperCase()
  if (LETTER_OR_DIGIT.test(upper) || FUNCTION_KEY.test(upper)) return upper
  if (upper === 'SPACE') return 'Space'
  return null
}

/** Lee un atajo escrito (`ctrl+win`, `Ctrl+Shift+r`) y comprueba que sirva. */
export function parseShortcut(text: string): ShortcutParse {
  const tokens = text
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return { ok: false, error: 'empty' }

  const modifiers = new Set<ShortcutModifier>()
  let key: string | null = null
  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES[token.toLowerCase()]
    if (modifier) {
      if (modifiers.has(modifier)) return { ok: false, error: 'repeated' }
      modifiers.add(modifier)
      continue
    }
    const normalized = normalizeKey(token)
    if (!normalized) return { ok: false, error: 'unknownKey' }
    if (key === normalized) return { ok: false, error: 'repeated' }
    if (key) return { ok: false, error: 'twoKeys' }
    key = normalized
  }

  if (modifiers.size === 0) return { ok: false, error: 'noModifier' }
  if (!key && modifiers.size < 2) return { ok: false, error: 'needsTwoModifiers' }
  const ordered = SHORTCUT_MODIFIERS.filter((m) => modifiers.has(m))
  return { ok: true, shortcut: { modifiers: ordered, key } }
}

/** El texto que se guarda: modificadores en orden fijo y la tecla al final. */
export function formatShortcut(shortcut: Shortcut): string {
  return [...shortcut.modifiers, ...(shortcut.key ? [shortcut.key] : [])].join('+')
}

/** El atajo guardado en forma canónica, o `null` si no vale. */
export function normalizeShortcut(text: string): string | null {
  const parsed = parseShortcut(text)
  return parsed.ok ? formatShortcut(parsed.shortcut) : null
}

/** Cómo se muestra: `Ctrl + Win`. */
export function shortcutLabel(shortcut: Shortcut): string {
  const names = shortcut.modifiers.map((m) => (m === 'Super' ? 'Win' : m))
  return [...names, ...(shortcut.key ? [shortcut.key] : [])].join(' + ')
}

/** Cómo está el atajo: desactivado, vigilando o sin poder vigilar (el sidecar falló). */
export type HotkeyStatus = 'off' | 'active' | 'failed'
