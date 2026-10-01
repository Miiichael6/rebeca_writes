import { describe, expect, it } from 'vitest'
import {
  DOUBLE_PRESS_MS,
  HOLD_START_MS,
  IDLE,
  nextGesture,
  type Gesture,
  type HotkeyInput
} from '../../src/main/domain/hotkey/gesture'

/** Aplica `[entrada, hora]` en orden y devuelve los gestos que salen. */
function gestures(inputs: [HotkeyInput, number][], latched = false): Gesture[] {
  let state = IDLE
  const out: Gesture[] = []
  for (const [input, now] of inputs) {
    const step = nextGesture(state, input, now, latched)
    state = step.state
    if (step.gesture) out.push(step.gesture)
  }
  return out
}

describe('nextGesture', () => {
  it('al pulsar pide despertar cuando se cumpla el tiempo de mantener', () => {
    expect(nextGesture(IDLE, 'down', 1000).wakeAt).toBe(1000 + HOLD_START_MS)
  })

  it('mantener graba y soltar para', () => {
    expect(
      gestures([
        ['down', 0],
        ['timer', HOLD_START_MS],
        ['up', 5000]
      ])
    ).toEqual(['startHold', 'stopHold'])
  })

  it('un toque corto no graba', () => {
    expect(
      gestures([
        ['down', 0],
        ['up', 100],
        ['timer', 100 + DOUBLE_PRESS_MS]
      ])
    ).toEqual([])
  })

  it('soltar antes de HOLD_START_MS no graba aunque el temporizador llegue tarde', () => {
    expect(
      gestures([
        ['down', 0],
        ['up', HOLD_START_MS - 1],
        ['timer', HOLD_START_MS]
      ])
    ).toEqual([])
  })

  it('un temporizador adelantado no empieza a grabar', () => {
    const step = nextGesture({ kind: 'pressed', at: 0 }, 'timer', HOLD_START_MS - 1)
    expect(step.gesture).toBeNull()
    expect(step.wakeAt).toBe(HOLD_START_MS)
  })

  it('la doble pulsación graba en manos libres y soltar no la para', () => {
    expect(
      gestures([
        ['down', 0],
        ['up', 100],
        ['down', 200],
        ['timer', 200 + HOLD_START_MS],
        ['up', 3000]
      ])
    ).toEqual(['startLatched'])
  })

  it('una segunda pulsación tardía cuenta como pulsación nueva', () => {
    expect(
      gestures([
        ['down', 0],
        ['up', 100],
        ['down', 100 + DOUBLE_PRESS_MS + 1],
        ['timer', 100 + DOUBLE_PRESS_MS + 1 + HOLD_START_MS],
        ['up', 5000]
      ])
    ).toEqual(['startHold', 'stopHold'])
  })

  it('otra tecla en medio (Ctrl+Win+→) no es el atajo', () => {
    expect(
      gestures([
        ['down', 0],
        ['other', 50],
        ['timer', HOLD_START_MS],
        ['up', 600]
      ])
    ).toEqual([])
  })

  it('otra tecla entre las dos pulsaciones anula la doble pulsación', () => {
    expect(
      gestures([
        ['down', 0],
        ['up', 100],
        ['other', 150],
        ['down', 200],
        ['up', 250]
      ])
    ).toEqual([])
  })

  it('otra tecla mientras se mantiene no corta la grabación', () => {
    expect(
      gestures([
        ['down', 0],
        ['timer', HOLD_START_MS],
        ['other', 1000],
        ['up', 2000]
      ])
    ).toEqual(['startHold', 'stopHold'])
  })

  it('grabando en manos libres, pulsar y soltar el atajo la para', () => {
    expect(
      gestures(
        [
          ['down', 0],
          ['up', 100]
        ],
        true
      )
    ).toEqual(['stopLatched'])
  })

  it('grabando en manos libres, Ctrl+Win+→ no la para', () => {
    expect(
      gestures(
        [
          ['down', 0],
          ['other', 50],
          ['up', 100]
        ],
        true
      )
    ).toEqual([])
  })
})
