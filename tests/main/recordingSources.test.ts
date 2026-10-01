import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AudioCapture, CaptureStream } from '../../src/main/application/ports/audioCapture'
import { openRecordingSource } from '../../src/main/application/recordingSources'
import type { DeviceKind } from '../../src/main/domain/capture/sidecarProtocol'

const RATE = 48_000

/** Un stream de mentira: el test empuja datos y errores a mano. */
class FakeStream implements CaptureStream {
  readonly sampleRate = RATE
  stopped = false
  data: (samples: Float32Array) => void = () => {}
  error: (reason: string) => void = () => {}

  constructor(readonly channels: number) {}

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

function fakeCapture(failing?: DeviceKind): {
  capture: AudioCapture
  streams: Partial<Record<DeviceKind, FakeStream>>
} {
  const streams: Partial<Record<DeviceKind, FakeStream>> = {}
  const capture: AudioCapture = {
    openDefault: async (kind) => {
      if (kind === failing) throw new Error('sin dispositivo')
      const stream = new FakeStream(kind === 'render' ? 2 : 1)
      streams[kind] = stream
      return stream
    },
    dispose: () => {}
  }
  return { capture, streams }
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
})
