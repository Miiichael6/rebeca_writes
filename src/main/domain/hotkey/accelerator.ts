import { parseShortcut, type ShortcutModifier } from '@shared/shortcut'

/** Modificadores como los nombra el sidecar `rl-hotkey` (ver `native/PROTOCOL.md`). */
export type ComboModifier = 'ctrl' | 'alt' | 'shift' | 'win'

/** La combinación que vigila el sidecar: modificadores y, si la hay, una tecla virtual (`VK_*`). */
export interface HotkeyCombo {
  modifiers: ComboModifier[]
  key: number | null
}

const COMBO_MODIFIER: Record<ShortcutModifier, ComboModifier> = {
  Ctrl: 'ctrl',
  Alt: 'alt',
  Shift: 'shift',
  Super: 'win'
}

const VK_SPACE = 0x20
const VK_F1 = 0x70

/** Código de tecla virtual de Windows de una tecla ya normalizada por `parseShortcut`. */
export function virtualKey(key: string): number {
  if (key === 'Space') return VK_SPACE
  if (key.length > 1 && key.startsWith('F')) return VK_F1 + Number(key.slice(1)) - 1
  // Letras y dígitos: su VK es su código ASCII en mayúsculas.
  return key.charCodeAt(0)
}

/** La combinación del sidecar para el atajo guardado; `null` si está desactivado o no vale. */
export function comboFor(shortcut: string | null): HotkeyCombo | null {
  if (shortcut === null) return null
  const parsed = parseShortcut(shortcut)
  if (!parsed.ok) return null
  const { modifiers, key } = parsed.shortcut
  return {
    modifiers: modifiers.map((m) => COMBO_MODIFIER[m]),
    key: key === null ? null : virtualKey(key)
  }
}
