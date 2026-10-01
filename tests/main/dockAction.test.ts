import { describe, expect, it } from 'vitest'
import { dockButtons, quitQuestion, visibleQuestion } from '../../src/main/domain/dock/dockAction'

describe('dockButtons', () => {
  it('sin grabar solo graba con 🎤', () => {
    expect(dockButtons(null, false)).toEqual({ left: null, right: 'record' })
  })

  it('grabando, ■ pregunta si terminar y 🎤 es solo un indicador', () => {
    expect(dockButtons(null, true)).toEqual({ left: 'askEnd', right: null })
  })

  it('"¿Terminar?": ✕ sigue grabando y ✓ para y guarda', () => {
    expect(dockButtons('end', true)).toEqual({ left: 'keepRecording', right: 'stopAndSave' })
  })

  it('"¿Salir?": ✕ se queda y ✓ sale, grabe o no', () => {
    expect(dockButtons('quit', false)).toEqual({ left: 'stay', right: 'quit' })
    expect(dockButtons('quitRecording', true)).toEqual({ left: 'stay', right: 'quit' })
  })
})

describe('visibleQuestion', () => {
  it('retira "¿Terminar?" si la grabación ya paró', () => {
    expect(visibleQuestion('end', false)).toBeNull()
    expect(visibleQuestion('end', true)).toBe('end')
  })

  it('deja las demás preguntas como están', () => {
    expect(visibleQuestion('quit', false)).toBe('quit')
    expect(visibleQuestion(null, true)).toBeNull()
  })
})

describe('quitQuestion', () => {
  it('avisa si hay una grabación en curso', () => {
    expect(quitQuestion(true)).toBe('quitRecording')
    expect(quitQuestion(false)).toBe('quit')
  })
})
