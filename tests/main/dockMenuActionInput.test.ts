import { describe, expect, it } from 'vitest'
import { toDockMenuAction } from '../../src/main/domain/dock/menuActionInput'

describe('toDockMenuAction', () => {
  it('acepta las acciones del menú', () => {
    expect(toDockMenuAction({ kind: 'quit' })).toEqual({ kind: 'quit' })
    expect(toDockMenuAction({ kind: 'record', source: 'voice', name: 'Grabación' })).toEqual({
      kind: 'record',
      source: 'voice',
      name: 'Grabación'
    })
  })

  it('lo mal formado solo cierra el menú', () => {
    expect(toDockMenuAction(null)).toEqual({ kind: 'close' })
    expect(toDockMenuAction({ kind: 'borrar' })).toEqual({ kind: 'close' })
    expect(toDockMenuAction({ kind: 'record', source: 'radio' })).toEqual({ kind: 'close' })
  })
})
