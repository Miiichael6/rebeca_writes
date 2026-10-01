import { describe, expect, it } from 'vitest'
import { remapChannels } from '../../src/main/domain/capture/channelMap'
import { SampleFifo } from '../../src/main/domain/capture/fifo'
import { softLimit } from '../../src/main/domain/capture/limiter'
import { LOOPBACK_GAP_MS, LoopbackClock } from '../../src/main/domain/capture/loopbackSilence'
import { MIX_FIFO_TARGET_MS, Mixer } from '../../src/main/domain/capture/mixer'
import { concat, rms, sine } from './audioSignals'

const RATE = 48_000
const BLOCK = 480 // 10 ms

describe('LoopbackClock', () => {
  it('no mete silencio mientras los bloques llegan seguidos', () => {
    const clock = new LoopbackClock(RATE, 0)
    for (let i = 1; i <= 50; i++) expect(clock.block(i * 10, BLOCK)).toBe(0)
  })

  it('rellena por reloj una pausa en las entregas, con tics o con el bloque siguiente', () => {
    const clock = new LoopbackClock(RATE, 0)
    clock.block(10, BLOCK)
    expect(clock.tick(10 + LOOPBACK_GAP_MS - 1)).toBe(0)
    // A 1 s debería llevar 48 000 muestras; ya hay 480.
    expect(clock.tick(1000)).toBe(RATE - BLOCK)
    // Medio segundo más tarde llega audio: falta el silencio de en medio, menos el propio bloque.
    expect(clock.block(1500, BLOCK)).toBe(RATE / 2 - BLOCK)
  })
})

describe('SampleFifo', () => {
  it('lee en orden aunque dé la vuelta y rellena con ceros lo que falta', () => {
    const fifo = new SampleFifo(1, 4)
    fifo.write(Float32Array.of(1, 2, 3))
    const out = new Float32Array(2)
    fifo.read(out)
    fifo.write(Float32Array.of(4, 5, 6))
    expect(fifo.frames).toBe(4)
    const all = new Float32Array(5)
    expect(fifo.read(all)).toBe(1)
    expect([...all]).toEqual([3, 4, 5, 6, 0])
  })

  it('al desbordarse tira lo más viejo', () => {
    const fifo = new SampleFifo(1, 3)
    expect(fifo.write(Float32Array.of(1, 2, 3, 4, 5))).toBe(2)
    const out = new Float32Array(3)
    fifo.read(out)
    expect([...out]).toEqual([3, 4, 5])
  })
})

describe('remapChannels y softLimit', () => {
  it('mono a estéreo duplica y estéreo a mono promedia', () => {
    expect([...remapChannels(Float32Array.of(0.5, -0.5), 1, 2)]).toEqual([0.5, 0.5, -0.5, -0.5])
    expect([...remapChannels(Float32Array.of(0.25, 0.75), 2, 1)]).toEqual([0.5])
  })

  it('deja pasar lo que está bajo el codo y nunca pasa del fondo de escala', () => {
    expect(softLimit(0.5)).toBe(0.5)
    expect(softLimit(1.6)).toBeLessThan(1)
    expect(softLimit(-1.6)).toBeGreaterThan(-1)
  })
})

describe('Mixer', () => {
  it('el loopback sale igual mientras no llega micrófono', () => {
    const mixer = new Mixer({ sampleRate: RATE, channels: 2 }, { sampleRate: RATE, channels: 1 })
    const system = sine(440, 0.3, 0.01, RATE, 2)
    expect([...mixer.pushMaster(system)]).toEqual([...system])
  })

  it('suma el micrófono (otra frecuencia y canales) al ritmo del loopback', () => {
    const mixer = new Mixer({ sampleRate: RATE, channels: 2 }, { sampleRate: 16_000, channels: 1 })
    const voice = sine(300, 0.3, 1, 16_000, 1)
    const system = new Float32Array(RATE * 2) // un segundo de silencio estéreo
    const out: Float32Array[] = []
    const voiceBlock = voice.length / 100
    const systemBlock = system.length / 100
    for (let i = 0; i < 100; i++) {
      mixer.pushSlave(voice.subarray(i * voiceBlock, (i + 1) * voiceBlock))
      out.push(mixer.pushMaster(system.subarray(i * systemBlock, (i + 1) * systemBlock)))
    }
    const mixed = concat(out)
    expect(mixed.length).toBe(system.length)
    // Tras el colchón inicial, la voz está entera: RMS de un seno de amplitud 0,3.
    const cushion = (MIX_FIFO_TARGET_MS / 1000) * RATE * 2
    expect(rms(mixed.subarray(cushion * 2, mixed.length - cushion * 2))).toBeCloseTo(
      0.3 / Math.SQRT2,
      2
    )
  })
})
