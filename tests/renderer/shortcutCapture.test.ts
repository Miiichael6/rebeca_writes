import { describe, expect, it } from 'vitest'
import {
  captureDone,
  captureResult,
  EMPTY_CAPTURE,
  pressKey,
  shortcutKey,
  type CaptureKey
} from '../../src/renderer/src/components/settings/ShortcutSettings/domain/capture'

const key = (code: string, held: Partial<CaptureKey> = {}): CaptureKey => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...held
})

describe('captura del atajo', () => {
  it('traduce el código de la tecla', () => {
    expect(shortcutKey('KeyR')).toBe('R')
    expect(shortcutKey('Digit7')).toBe('7')
    expect(shortcutKey('F12')).toBe('F12')
    expect(shortcutKey('Space')).toBe('Space')
    expect(shortcutKey('ArrowRight')).toBeNull()
  })

  it('Ctrl+Win: junta lo pulsado y termina al soltarlo todo', () => {
    let state = pressKey(EMPTY_CAPTURE, key('ControlLeft', { ctrlKey: true }))
    state = pressKey(state, key('MetaLeft', { ctrlKey: true, metaKey: true }))
    expect(captureDone(state, key('MetaLeft', { ctrlKey: true }))).toBe(false)
    expect(captureDone(state, key('ControlLeft'))).toBe(true)
    expect(captureResult(state)).toEqual({ ok: true, shortcut: 'Ctrl+Super' })
  })

  it('Ctrl+Shift+R se guarda con la tecla al final', () => {
    let state = pressKey(EMPTY_CAPTURE, key('ShiftLeft', { shiftKey: true }))
    state = pressKey(state, key('ControlLeft', { ctrlKey: true, shiftKey: true }))
    state = pressKey(state, key('KeyR', { ctrlKey: true, shiftKey: true }))
    expect(captureResult(state)).toEqual({ ok: true, shortcut: 'Ctrl+Shift+R' })
  })

  it('rechaza una tecla sola o un único modificador', () => {
    const letter = pressKey(EMPTY_CAPTURE, key('KeyA'))
    expect(captureDone(letter, key('KeyA'))).toBe(true)
    expect(captureResult(letter)).toEqual({ ok: false, error: 'noModifier' })
    const ctrl = pressKey(EMPTY_CAPTURE, key('ControlLeft', { ctrlKey: true }))
    expect(captureResult(ctrl)).toEqual({ ok: false, error: 'needsTwoModifiers' })
  })
})
