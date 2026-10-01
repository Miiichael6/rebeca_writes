import { describe, expect, it } from 'vitest'
import { hotkeyCommand, parseHotkeyEvent } from '../../src/main/domain/hotkey/hotkeyProtocol'
import { toNameTemplates } from '../../src/main/domain/hotkey/nameTemplates'

describe('protocolo de rl-hotkey', () => {
  it('manda la combinación o la orden de apagar', () => {
    expect(hotkeyCommand({ modifiers: ['ctrl', 'win'], key: null })).toEqual({
      cmd: 'watch',
      modifiers: ['ctrl', 'win'],
      key: null
    })
    expect(hotkeyCommand(null)).toEqual({ cmd: 'off' })
  })

  it('lee los eventos y descarta lo que no entiende', () => {
    expect(parseHotkeyEvent('{"type":"down"}')).toEqual({ type: 'down' })
    expect(parseHotkeyEvent('{"type":"error","code":"hook_failed","message":"x"}')).toEqual({
      type: 'error',
      code: 'hook_failed',
      message: 'x'
    })
    expect(parseHotkeyEvent('{"type":"nope"}')).toBeNull()
    expect(parseHotkeyEvent('no es json')).toBeNull()
    expect(parseHotkeyEvent('[]')).toBeNull()
  })
})

describe('plantillas de nombre que manda el renderer', () => {
  it('acepta una por fuente y rechaza lo incompleto', () => {
    const templates = { voice: 'Voz {date}', system: 'Sistema {date}', both: 'Ambos {date}' }
    expect(toNameTemplates(templates)).toEqual(templates)
    expect(toNameTemplates({ voice: 'Voz' })).toBeNull()
    expect(toNameTemplates({ ...templates, both: 3 })).toBeNull()
    expect(toNameTemplates('x')).toBeNull()
  })
})
