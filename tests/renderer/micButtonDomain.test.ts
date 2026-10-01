import { describe, expect, it } from 'vitest'
import {
  elapsedLabel,
  micButtonState,
  pushLevel,
  selectedMicId,
  silentWave,
  usesMicrophone
} from '../../src/renderer/src/components/MicButton/domain/mic'
import { fillRecordingName, recordingStamp } from '../../src/shared/recording'

describe('MicButton', () => {
  it('solo Mi voz y Ambos eligen micrófono', () => {
    expect(usesMicrophone('system')).toBe(false)
    expect(usesMicrophone('voice')).toBe(true)
    expect(usesMicrophone('both')).toBe(true)
  })

  it('marca el micrófono guardado solo si sigue conectado', () => {
    const mics = [{ id: 'a', name: 'USB', isDefault: false }]
    expect(selectedMicId('a', mics)).toBe('a')
    expect(selectedMicId('b', mics)).toBe('')
    expect(selectedMicId('', mics)).toBe('')
  })

  it('sella la fecha local sin dos puntos (vale como nombre de archivo)', () => {
    expect(recordingStamp(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05 09-07')
  })

  it('rellena la fecha de una plantilla de nombre (la del atajo)', () => {
    expect(fillRecordingName('Grabación {date} · Mi voz', new Date(2026, 9, 1, 14, 30))).toBe(
      'Grabación 2026-10-01 14-30 · Mi voz'
    )
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

describe('pushLevel', () => {
  it('entra por la derecha, sale la más vieja y se recorta a 0..1', () => {
    expect(pushLevel([0.1, 0.2, 0.3], 0.4)).toEqual([0.2, 0.3, 0.4])
    expect(pushLevel([0, 0], 2)).toEqual([0, 1])
    expect(silentWave(3)).toEqual([0, 0, 0])
  })
})
