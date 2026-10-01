import { describe, expect, it } from 'vitest'
import {
  elapsedLabel,
  micButtonState,
  recordingStamp
} from '../../src/renderer/src/components/Toolbar/domain/mic'

describe('Toolbar · grabar', () => {
  it('sella la fecha local sin dos puntos (vale como nombre de archivo)', () => {
    expect(recordingStamp(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05 09-07')
  })

  it('cuenta m:ss y pasa a h:mm:ss desde la primera hora', () => {
    expect(elapsedLabel(1000, 1000 + 65_400)).toBe('1:05')
    expect(elapsedLabel(0, 3_725_000)).toBe('1:02:05')
  })

  it('sin grabar, se deshabilita con otra sesión en vivo o esperando al main', () => {
    const idle = { recording: false } as const
    expect(micButtonState(idle, false, false)).toEqual({ kind: 'idle', disabled: false })
    expect(micButtonState(idle, true, false)).toEqual({ kind: 'idle', disabled: true })
    expect(micButtonState(idle, false, true)).toEqual({ kind: 'idle', disabled: true })
  })

  it('grabando, su propia sesión en vivo no lo bloquea', () => {
    const rec = { recording: true, source: 'both', startedAt: 5 } as const
    expect(micButtonState(rec, true, false)).toEqual({
      kind: 'recording',
      source: 'both',
      startedAt: 5
    })
  })
})
