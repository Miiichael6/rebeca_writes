import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AudioCapture, CaptureStream } from '../../src/main/application/ports/audioCapture'
import {
  openRecordingSource,
  REOPEN_ATTEMPTS,
  REOPEN_DELAY_MS
} from '../../src/main/application/recordingSources'
import type { DeviceKind } from '../../src/main/domain/capture/sidecarProtocol'

const RATE = 48_000

/** Un stream de mentira: el test empuja datos y errores a mano. */
class FakeStream implements CaptureStream {
  stopped = false
  data: (samples: Float32Array) => void = () => {}
  error: (reason: string) => void = () => {}

  constructor(
    readonly channels: number,
    readonly sampleRate = RATE
  ) {}

  onData(listener: (samples: Float32Array) => void): void {
    this.data = listener
  }
  onError(listener: (reason: string) => void): void {
    this.error = listener
  }
  async stop(): Promise<void> {
    this.stopped = true
  }
}

/**
 * `failing` no se puede abrir; las salidas que se abran después de la primera usan `nextOutput`
 * (para simular que Windows cambia a otro dispositivo con otro formato).
 */
function fakeCapture(failing?: DeviceKind): {
  capture: AudioCapture
  streams: Partial<Record<DeviceKind, FakeStream>>
  opened: Array<[DeviceKind, string | undefined]>
  nextOutput: { channels: number; sampleRate: number } | null
} {
  const streams: Partial<Record<DeviceKind, FakeStream>> = {}
  const opened: Array<[DeviceKind, string | undefined]> = []
  const fake = {
    capture: null as unknown as AudioCapture,
    streams,
    opened,
    nextOutput: null as { channels: number; sampleRate: number } | null
  }
  fake.capture = {
    listDevices: async () => [],
    open: async (kind, deviceId) => {
      if (kind === failing) throw new Error('sin dispositivo')
      const reopened = kind === 'render' && streams.render
      if (reopened && !fake.nextOutput) throw new Error('sin salida')
      opened.push([kind, deviceId])
      const stream = reopened
        ? new FakeStream(fake.nextOutput!.channels, fake.nextOutput!.sampleRate)
        : new FakeStream(kind === 'render' ? 2 : 1)
      streams[kind] = stream
      return stream
    },
    dispose: () => {}
  }
  return fake
}

/** Muestras por canal recibidas del stream. */
function collect(stream: CaptureStream): () => number {
  let samples = 0
  stream.onData((block) => {
    samples += block.length
  })
  return () => samples / stream.channels
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => vi.useRealTimers())

describe('openRecordingSource', () => {
  it('Computadora: sin nada sonando, la grabación sigue al reloj con silencio', async () => {
    const { capture } = fakeCapture()
    const stream = await openRecordingSource(capture, 'system')
    const frames = collect(stream)
    await vi.advanceTimersByTimeAsync(2000)
    expect(frames()).toBe(2 * RATE)
    await stream.stop()
  })

  it('Mi voz: el micrófono tal cual', async () => {
    const { capture, streams } = fakeCapture()
    const stream = await openRecordingSource(capture, 'voice')
    expect(stream).toBe(streams.capture)
  })

  it('Mi voz y Ambos abren el micrófono elegido; el loopback siempre el predeterminado', async () => {
    const { capture, opened } = fakeCapture()
    await openRecordingSource(capture, 'voice', 'usb')
    await (await openRecordingSource(capture, 'both', 'usb')).stop()
    expect(opened).toEqual([
      ['capture', 'usb'],
      ['render', undefined],
      ['capture', 'usb']
    ])
  })

  it('Ambos: sale al formato del loopback y sigue al reloj aunque solo hable el micrófono', async () => {
    const { capture, streams } = fakeCapture()
    const stream = await openRecordingSource(capture, 'both')
    expect(stream.channels).toBe(2)
    const frames = collect(stream)
    for (let i = 0; i < 100; i++) {
      streams.capture!.data(new Float32Array(480).fill(0.1))
      await vi.advanceTimersByTimeAsync(10)
    }
    expect(frames()).toBe(RATE)
  })

  it('Ambos: si se pierde el micrófono se cierra el loopback y se avisa', async () => {
    const { capture, streams } = fakeCapture()
    const stream = await openRecordingSource(capture, 'both')
    const reasons: string[] = []
    stream.onError((reason) => reasons.push(reason))
    streams.capture!.error('device_lost')
    expect(reasons).toEqual(['device_lost'])
    expect(streams.render!.stopped).toBe(true)
  })

  it('Ambos: si no abre el micrófono, cierra el loopback', async () => {
    const { capture, streams } = fakeCapture('capture')
    await expect(openRecordingSource(capture, 'both')).rejects.toThrow('sin dispositivo')
    expect(streams.render!.stopped).toBe(true)
  })

  it('Computadora: si se pierde la salida sigue con la nueva, adaptada al formato del inicio', async () => {
    const fake = fakeCapture()
    fake.nextOutput = { channels: 1, sampleRate: 44_100 }
    const stream = await openRecordingSource(fake.capture, 'system')
    const reasons: string[] = []
    stream.onError((reason) => reasons.push(reason))
    const blocks: Float32Array[] = []
    stream.onData((block) => blocks.push(block))
    const lost = fake.streams.render!
    lost.error('device_lost')
    await vi.advanceTimersByTimeAsync(REOPEN_DELAY_MS)

    const speakers = fake.streams.render!
    expect(speakers).not.toBe(lost)
    blocks.length = 0
    speakers.data(new Float32Array(4410).fill(0.5))
    lost.data(new Float32Array(960).fill(0.9))
    expect(blocks.length).toBe(1)
    expect(blocks[0].length % 2).toBe(0)
    expect(blocks[0].length).toBeGreaterThan(0)
    expect(reasons).toEqual([])
    await stream.stop()
    expect(speakers.stopped).toBe(true)
  })

  it('Computadora: si no queda ninguna salida, termina con el motivo', async () => {
    const fake = fakeCapture()
    const stream = await openRecordingSource(fake.capture, 'system')
    const reasons: string[] = []
    stream.onError((reason) => reasons.push(reason))
    fake.streams.render!.error('device_lost')
    await vi.advanceTimersByTimeAsync(REOPEN_ATTEMPTS * REOPEN_DELAY_MS)
    expect(reasons).toEqual(['device_lost'])
  })

  it('Computadora: si se para mientras reabre, cierra la salida nueva', async () => {
    const fake = fakeCapture()
    fake.nextOutput = { channels: 2, sampleRate: RATE }
    const stream = await openRecordingSource(fake.capture, 'system')
    const lost = fake.streams.render!
    lost.error('device_lost')
    await stream.stop()
    await vi.advanceTimersByTimeAsync(REOPEN_ATTEMPTS * REOPEN_DELAY_MS)
    expect(fake.streams.render).toBe(lost)
  })

  it('Ambos: si se pierde la salida sigue grabando con el micrófono', async () => {
    const fake = fakeCapture()
    fake.nextOutput = { channels: 2, sampleRate: RATE }
    const stream = await openRecordingSource(fake.capture, 'both')
    const reasons: string[] = []
    stream.onError((reason) => reasons.push(reason))
    fake.streams.render!.error('device_lost')
    await vi.advanceTimersByTimeAsync(REOPEN_DELAY_MS)
    expect(reasons).toEqual([])
    expect(fake.streams.capture!.stopped).toBe(false)
    await stream.stop()
  })
})
