import { describe, expect, it } from 'vitest'
import { parseFullscreenEvent } from '../../src/main/domain/dock/fullscreenProtocol'

describe('parseFullscreenEvent', () => {
  it('lee si hay una app a pantalla completa', () => {
    expect(parseFullscreenEvent('{"type":"fullscreen","active":true}')).toEqual({
      type: 'fullscreen',
      active: true
    })
    expect(parseFullscreenEvent('{"type":"fullscreen","active":false}')).toEqual({
      type: 'fullscreen',
      active: false
    })
  })

  it('descarta líneas que no son eventos conocidos', () => {
    expect(parseFullscreenEvent('hola')).toBeNull()
    expect(parseFullscreenEvent('{"type":"fullscreen"}')).toBeNull()
    expect(parseFullscreenEvent('{"type":"fullscreen","active":"sí"}')).toBeNull()
    expect(parseFullscreenEvent('{"type":"otro"}')).toBeNull()
  })
})
