import { describe, expect, it } from 'vitest'
import { downmixToMono, floatToS16le, Pcm16kConverter } from '../../src/main/domain/capture/pcm16k'
import { Resampler } from '../../src/main/domain/capture/resampler'
import { concat, rms, sine } from './audioSignals'

/** Toda la señal por un remuestreador, en bloques de los tamaños dados (en muestras), y vaciado. */
function run(
  resampler: Resampler,
  signal: Float32Array,
  channels: number,
  blocks: number[]
): Float32Array {
  const parts: Float32Array[] = []
  let at = 0
  for (let i = 0; at < signal.length; i++) {
    const size = blocks[i % blocks.length] * channels
    parts.push(resampler.process(signal.subarray(at, at + size)))
    at += size
  }
  parts.push(resampler.flush())
  return concat(parts)
}

/** Frecuencia a partir de los cruces por cero ascendentes, lejos de los bordes. */
function frequencyOf(mono: Float32Array, rate: number): number {
  const crossings: number[] = []
  for (let i = 1; i < mono.length; i++) {
    if (mono[i - 1] < 0 && mono[i] >= 0) crossings.push(i - mono[i] / (mono[i] - mono[i - 1]))
  }
  const inner = crossings.slice(2, -2)
  return ((inner.length - 1) * rate) / (inner[inner.length - 1] - inner[0])
}

function readS16le(bytes: Buffer): number[] {
  const out: number[] = []
  for (let at = 0; at < bytes.length; at += 2) out.push(bytes.readInt16LE(at) / 32767)
  return out
}

describe('Resampler', () => {
  it('convierte entre las frecuencias habituales con la longitud y el tono esperados', () => {
    for (const inRate of [16_000, 44_100, 48_000]) {
      for (const outRate of [16_000, 44_100, 48_000]) {
        const input = sine(440, 0.5, 0.5, inRate, 1)
        const out = run(new Resampler({ inRate, outRate, channels: 1 }), input, 1, [512])
        expect(Math.abs(out.length - (input.length * outRate) / inRate)).toBeLessThanOrEqual(1)
        expect(frequencyOf(out, outRate)).toBeCloseTo(440, 0)
      }
    }
  })

  it('da las mismas muestras se parta como se parta la entrada', () => {
    const input = sine(997, 0.5, 1, 48_000, 2)
    const options = { inRate: 48_000, outRate: 16_000, channels: 2 }
    const whole = run(new Resampler(options), input, 2, [48_000])
    const split = run(new Resampler(options), input, 2, [1, 37, 480, 3, 2048, 129])
    expect(split).toEqual(whole)
  })

  it('copia las muestras si las frecuencias coinciden', () => {
    const input = sine(440, 0.5, 0.1, 48_000, 2)
    const out = run(
      new Resampler({ inRate: 48_000, outRate: 48_000, channels: 2 }),
      input,
      2,
      [480]
    )
    expect(out).toEqual(input)
  })
})

describe('pcm16k', () => {
  it('downmixToMono hace la media de los canales', () => {
    expect([...downmixToMono(new Float32Array([1, 0, 0.5, 0.5, -1, 1]), 2)]).toEqual([0.5, 0.5, 0])
  })

  it('floatToS16le escribe 16 bits little-endian y recorta lo que se pasa de escala', () => {
    const bytes = floatToS16le(new Float32Array([0, 1, -1, 2, -2, 0.5]))
    expect([...new Int16Array(bytes.buffer, bytes.byteOffset, 6)]).toEqual([
      0, 32767, -32767, 32767, -32767, 16384
    ])
  })

  it('1 s de estéreo a 48 kHz da 1 s de mono a 16 kHz, bloque a bloque, con el mismo nivel', () => {
    const converter = new Pcm16kConverter(48_000, 2)
    const input = sine(440, 0.5, 1, 48_000, 2)
    const chunks: Buffer[] = []
    for (let at = 0; at < input.length; at += 960) {
      chunks.push(converter.convert(input.subarray(at, at + 960)))
    }
    chunks.push(converter.flush())
    const samples = readS16le(Buffer.concat(chunks))
    expect(Math.abs(samples.length - 16_000)).toBeLessThanOrEqual(1)
    expect(rms(samples.slice(1000, 15_000))).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  it('quita lo que 16 kHz no puede representar en vez de doblarlo', () => {
    const converter = new Pcm16kConverter(48_000, 1)
    const samples = readS16le(converter.convert(sine(12_000, 0.5, 0.5, 48_000, 1)))
    expect(rms(samples.slice(500, samples.length - 500))).toBeLessThan(0.01)
  })
})
