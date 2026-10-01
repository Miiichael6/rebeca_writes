import { describe, expect, it } from 'vitest'
import {
  CALL_END_GRACE_MS,
  NO_CALLS,
  SUGGESTION_TIMEOUT_MS,
  nextSuggestion,
  type SuggestionAction,
  type SuggestionInput,
  type SuggestionState
} from '../../src/main/domain/meeting/meetingSuggestion'

type Event = [input: SuggestionInput, now: number, recording?: boolean]

const mic = (...apps: string[]): SuggestionInput => ({ type: 'micUsers', apps })
const answered: SuggestionInput = { type: 'answered' }
const timer: SuggestionInput = { type: 'timer' }

/** Aplica los eventos en orden y devuelve las acciones que salen (una por evento o `null`). */
function run(events: Event[], state: SuggestionState = NO_CALLS): (SuggestionAction | null)[] {
  return events.map(([input, now, recording = false]) => {
    const step = nextSuggestion(state, input, now, recording)
    state = step.state
    return step.action
  })
}

describe('nextSuggestion', () => {
  it('la primera lectura solo marca la base, aunque una app tenga el micrófono', () => {
    expect(run([[mic('Webex'), 0]])).toEqual([null])
    expect(
      run([
        [mic('Webex'), 0],
        [mic('Webex', 'Teams'), 1000]
      ])[1]
    ).toEqual({
      type: 'suggest',
      app: 'Teams'
    })
  })

  it('pregunta cuando una app de llamadas coge el micrófono', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000]
      ])
    ).toEqual([null, { type: 'suggest', app: 'Teams' }])
  })

  it('con ✕ no repite en la misma llamada pero sí en la siguiente', () => {
    const end = 3000 + CALL_END_GRACE_MS
    expect(
      run([
        [mic(), 0],
        [mic('Zoom'), 1000],
        [answered, 2000],
        [mic(), 3000],
        [mic('Zoom'), 4000],
        [mic(), 5000],
        [timer, 5000 + CALL_END_GRACE_MS],
        [mic('Zoom'), end + 3000]
      ])
    ).toEqual([
      null,
      { type: 'suggest', app: 'Zoom' },
      null,
      null,
      null,
      null,
      null,
      {
        type: 'suggest',
        app: 'Zoom'
      }
    ])
  })

  it('sin respuesta, retira la pregunta y no la repite en esa llamada', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000],
        [timer, 1000 + SUGGESTION_TIMEOUT_MS],
        [mic('Teams'), 2000 + SUGGESTION_TIMEOUT_MS]
      ])
    ).toEqual([null, { type: 'suggest', app: 'Teams' }, { type: 'withdraw' }, null])
  })

  it('pide despertar para el tiempo límite de la pregunta', () => {
    const primed = nextSuggestion(NO_CALLS, mic(), 0, false).state
    expect(nextSuggestion(primed, mic('Teams'), 1000, false).wakeAt).toBe(
      1000 + SUGGESTION_TIMEOUT_MS
    )
  })

  it('si la llamada termina sin respuesta, retira la pregunta tras el margen', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000],
        [mic(), 2000],
        [timer, 2000 + CALL_END_GRACE_MS]
      ])
    ).toEqual([null, { type: 'suggest', app: 'Teams' }, null, { type: 'withdraw' }])
  })

  it('no pregunta si ya se está grabando', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000, true]
      ])
    ).toEqual([null, null])
  })

  it('empezar a grabar por otro lado retira la pregunta', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000],
        [{ type: 'recordingChanged' }, 2000, true]
      ])
    ).toEqual([null, { type: 'suggest', app: 'Teams' }, { type: 'withdraw' }])
  })

  it('responder no pide retirar la pregunta (ya la quitó el dock)', () => {
    expect(
      run([
        [mic(), 0],
        [mic('Teams'), 1000],
        [answered, 2000]
      ])[2]
    ).toBeNull()
  })
})
