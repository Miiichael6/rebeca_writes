import { describe, expect, it } from 'vitest'
import type { DockView } from '@shared/dock'
import { dockWidth } from '../../src/main/domain/dock/dockWidth'

const IDLE: DockView = { out: true, recording: false, question: null, left: null, right: 'record' }
const RECORDING: DockView = { ...IDLE, recording: true, left: 'askEnd', right: null }
const QUESTION: DockView = { ...IDLE, question: 'quit', left: 'stay', right: 'quit' }

describe('dockWidth', () => {
  it('crece con cada botón que muestra', () => {
    expect(dockWidth(RECORDING)).toBeGreaterThan(dockWidth(IDLE))
  })

  it('el 🎤 de indicador cuenta como botón mientras graba', () => {
    expect(dockWidth(RECORDING)).toBe(dockWidth({ ...RECORDING, right: 'record' }))
  })

  it('sin botones queda solo la onda', () => {
    expect(dockWidth({ ...IDLE, right: null })).toBeLessThan(dockWidth(IDLE))
  })

  it('la pregunta ocupa más que la onda', () => {
    expect(dockWidth(QUESTION)).toBeGreaterThan(dockWidth({ ...QUESTION, question: null }))
  })

  it('"¿Grabar reunión?" es más larga que "¿Salir?" y deja más hueco', () => {
    const meeting: DockView = {
      ...QUESTION,
      question: 'meeting',
      left: 'dismissMeeting',
      right: 'recordMeeting'
    }
    expect(dockWidth(meeting)).toBeGreaterThan(dockWidth(QUESTION))
  })
})
