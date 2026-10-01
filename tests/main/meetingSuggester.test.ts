import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MicState } from '@shared/recording'
import { MeetingSuggester } from '../../src/main/application/meetingSuggester'
import { SUGGESTION_TIMEOUT_MS } from '../../src/main/domain/meeting/meetingSuggestion'

const ZOOM = 'C:#Program Files#Zoom#bin#Zoom.exe'
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup() {
  let changed: ((apps: string[]) => void) | null = null
  const source = {
    start: vi.fn((listener: (apps: string[]) => void) => (changed = listener)),
    stop: vi.fn(() => (changed = null))
  }
  let state: MicState = { recording: false }
  const micListeners: ((state: MicState) => void)[] = []
  const mic = {
    state: () => state,
    onStateChange: (listener: (state: MicState) => void) => {
      micListeners.push(listener)
      return () => {}
    }
  }
  const setRecording = (recording: boolean): void => {
    state = recording ? { recording, source: 'both', startedAt: 0 } : { recording }
    micListeners.forEach((listener) => listener(state))
  }
  let answered: (() => void) | null = null
  const dock = {
    suggestMeeting: vi.fn((callback: () => void) => (answered = callback)),
    withdrawMeeting: vi.fn()
  }
  const meetings = new MeetingSuggester({ source, mic, dock, log })
  const micUsers = (...apps: string[]): void => changed?.(apps)
  return { meetings, source, dock, micUsers, setRecording, answer: () => answered?.() }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('MeetingSuggester', () => {
  it('pregunta cuando una app de llamadas coge el micrófono', () => {
    const { meetings, dock, micUsers } = setup()
    meetings.configure(true)
    micUsers()
    micUsers(ZOOM)
    expect(dock.suggestMeeting).toHaveBeenCalledOnce()
  })

  it('no pregunta por apps que no son de llamadas', () => {
    const { meetings, dock, micUsers } = setup()
    meetings.configure(true)
    micUsers()
    micUsers('Microsoft.WindowsSoundRecorder_8wekyb3d8bbwe', 'C:#Apps#rl-capture.exe')
    expect(dock.suggestMeeting).not.toHaveBeenCalled()
  })

  it('sin respuesta, retira la pregunta pasado el tiempo', () => {
    const { meetings, dock, micUsers } = setup()
    meetings.configure(true)
    micUsers()
    micUsers(ZOOM)
    vi.advanceTimersByTime(SUGGESTION_TIMEOUT_MS)
    expect(dock.withdrawMeeting).toHaveBeenCalledOnce()
  })

  it('al responder no la retira ni la repite en la misma llamada', () => {
    const { meetings, dock, micUsers, answer } = setup()
    meetings.configure(true)
    micUsers()
    micUsers(ZOOM)
    answer()
    micUsers(ZOOM)
    vi.advanceTimersByTime(SUGGESTION_TIMEOUT_MS)
    expect(dock.suggestMeeting).toHaveBeenCalledOnce()
    expect(dock.withdrawMeeting).not.toHaveBeenCalled()
  })

  it('si empieza a grabar por otro lado, retira la pregunta', () => {
    const { meetings, dock, micUsers, setRecording } = setup()
    meetings.configure(true)
    micUsers()
    micUsers(ZOOM)
    setRecording(true)
    expect(dock.withdrawMeeting).toHaveBeenCalledOnce()
  })

  it('apagado no vigila; al apagarlo para el sidecar y retira la pregunta', () => {
    const { meetings, source, dock, micUsers } = setup()
    expect(source.start).not.toHaveBeenCalled()
    meetings.configure(true)
    micUsers()
    micUsers(ZOOM)
    meetings.configure(false)
    expect(source.stop).toHaveBeenCalledOnce()
    expect(dock.withdrawMeeting).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
