import { describe, expect, it } from 'vitest'
import { LevelMeter, peakToLevel } from '../../src/main/domain/capture/levelMeter'

describe('peakToLevel', () => {
  it('el silencio es 0, el máximo 1 y -25 dB queda a media altura', () => {
    expect(peakToLevel(0)).toBe(0)
    expect(peakToLevel(1)).toBe(1)
    expect(peakToLevel(10 ** (-25 / 20))).toBeCloseTo(0.5)
    expect(peakToLevel(1e-5)).toBe(0)
  })
})

describe('LevelMeter', () => {
  it('da un nivel por cada 50 ms de audio, se parta como se parta', () => {
    const meter = new LevelMeter(1000, 2)
    // 50 frames estéreo = 100 muestras por ventana
    expect(meter.push(new Float32Array(60))).toEqual([])
    const block = new Float32Array(140)
    block[100] = 1
    expect(meter.push(block)).toEqual([0, 1])
  })
})
