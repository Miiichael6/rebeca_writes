import { describe, expect, it } from 'vitest'
import {
  isSilent,
  MAX_WINDOW_SEC,
  nextWindowLength,
  SAMPLE_RATE,
  shiftSegments
} from '../../src/main/live/liveWindows'
import { pcmToWav } from '../../src/main/live/pcmWav'

/** Audio de prueba: tono fuerte con un hueco de silencio en `gapAt` (segundos). */
function audio(seconds: number, gapAt?: number): Int16Array {
  const samples = new Int16Array(seconds * SAMPLE_RATE)
  for (let i = 0; i < samples.length; i++) samples[i] = i % 2 ? 8000 : -8000
  if (gapAt !== undefined) {
    const from = Math.round(gapAt * SAMPLE_RATE)
    samples.fill(0, from, from + SAMPLE_RATE / 5)
  }
  return samples
}

describe('nextWindowLength', () => {
  it('espera hasta tener el mínimo', () => {
    expect(nextWindowLength(audio(3), false)).toBeNull()
    expect(nextWindowLength(new Int16Array(0), true)).toBeNull()
  })

  it('corta en el silencio del final', () => {
    const cut = nextWindowLength(audio(8, 7), false)!
    expect(cut / SAMPLE_RATE).toBeGreaterThanOrEqual(7)
    expect(cut / SAMPLE_RATE).toBeLessThanOrEqual(7.2)
  })

  it('nunca pasa del máximo', () => {
    const cut = nextWindowLength(audio(45), false)!
    expect(cut).toBeLessThanOrEqual(MAX_WINDOW_SEC * SAMPLE_RATE)
    expect(cut).toBeGreaterThan((MAX_WINDOW_SEC - 3) * SAMPLE_RATE)
  })

  it('al terminar toma todo lo que queda', () => {
    expect(nextWindowLength(audio(2), true)).toBe(2 * SAMPLE_RATE)
    expect(nextWindowLength(audio(40), true)).toBeLessThanOrEqual(MAX_WINDOW_SEC * SAMPLE_RATE)
  })
})

describe('isSilent', () => {
  it('distingue silencio de voz', () => {
    expect(isSilent(new Int16Array(SAMPLE_RATE))).toBe(true)
    expect(isSilent(audio(1))).toBe(false)
  })
})

describe('shiftSegments', () => {
  it('suma el desplazamiento de la ventana', () => {
    expect(shiftSegments([{ start: 1, end: 2.5, text: 'hola' }], 30)).toEqual([
      { start: 31, end: 32.5, text: 'hola' }
    ])
  })
})

describe('pcmToWav', () => {
  it('pone una cabecera RIFF de 44 bytes con los tamaños', () => {
    const wav = pcmToWav(new Uint8Array(3200))
    expect(wav.length).toBe(3244)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE)
    expect(wav.readUInt32LE(40)).toBe(3200)
  })
})
