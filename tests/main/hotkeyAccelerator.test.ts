import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RECORD_SHORTCUT,
  normalizeShortcut,
  parseShortcut,
  shortcutLabel
} from '../../src/shared/shortcut'
import { comboFor, virtualKey } from '../../src/main/domain/hotkey/accelerator'

describe('parseShortcut', () => {
  it('normaliza mayúsculas, alias y orden', () => {
    expect(normalizeShortcut('win+ctrl')).toBe('Ctrl+Super')
    expect(normalizeShortcut('shift + control + r')).toBe('Ctrl+Shift+R')
    expect(normalizeShortcut('Meta+Alt+f9')).toBe('Alt+Super+F9')
    expect(normalizeShortcut('ctrl+alt+space')).toBe('Ctrl+Alt+Space')
  })

  it('exige al menos un modificador', () => {
    expect(parseShortcut('R')).toEqual({ ok: false, error: 'noModifier' })
  })

  it('solo modificadores: al menos dos', () => {
    expect(parseShortcut('Ctrl')).toEqual({ ok: false, error: 'needsTwoModifiers' })
    expect(parseShortcut('Ctrl+Win').ok).toBe(true)
  })

  it('rechaza repetidas, dos teclas, teclas desconocidas y el vacío', () => {
    expect(parseShortcut('Ctrl+Control+R')).toEqual({ ok: false, error: 'repeated' })
    expect(parseShortcut('Ctrl+R+R')).toEqual({ ok: false, error: 'repeated' })
    expect(parseShortcut('Ctrl+R+T')).toEqual({ ok: false, error: 'twoKeys' })
    expect(parseShortcut('Ctrl+Escape')).toEqual({ ok: false, error: 'unknownKey' })
    expect(parseShortcut('Ctrl+F25')).toEqual({ ok: false, error: 'unknownKey' })
    expect(parseShortcut(' + ')).toEqual({ ok: false, error: 'empty' })
  })

  it('el de por defecto es válido y se muestra como Ctrl + Win', () => {
    const parsed = parseShortcut(DEFAULT_RECORD_SHORTCUT)
    expect(parsed.ok && shortcutLabel(parsed.shortcut)).toBe('Ctrl + Win')
  })
})

describe('comboFor', () => {
  it('pasa el atajo al formato del sidecar', () => {
    expect(comboFor('Ctrl+Super')).toEqual({ modifiers: ['ctrl', 'win'], key: null })
    expect(comboFor('Ctrl+Shift+R')).toEqual({ modifiers: ['ctrl', 'shift'], key: 0x52 })
  })

  it('desactivado o no válido no vigila nada', () => {
    expect(comboFor(null)).toBeNull()
    expect(comboFor('R')).toBeNull()
  })

  it('códigos de tecla virtual de Windows', () => {
    expect(virtualKey('A')).toBe(0x41)
    expect(virtualKey('7')).toBe(0x37)
    expect(virtualKey('F1')).toBe(0x70)
    expect(virtualKey('F24')).toBe(0x87)
    expect(virtualKey('Space')).toBe(0x20)
  })
})
