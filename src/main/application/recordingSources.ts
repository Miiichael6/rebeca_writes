import type { RecordingSource } from '@shared/recording'
import { LOOPBACK_GAP_MS, LoopbackClock } from '../domain/capture/loopbackSilence'
import { Mixer } from '../domain/capture/mixer'
import type { AudioCapture, CaptureStream } from './ports/audioCapture'

/**
 * Las tres fuentes de grabación (tarea 29) como un solo `CaptureStream`: Computadora es el
 * loopback con sus silencios rellenados, Mi voz es el micrófono tal cual y Ambos es la mezcla de
 * los dos, con el loopback como reloj. Perder cualquiera de los dispositivos termina el stream.
 */
export async function openRecordingSource(
  capture: AudioCapture,
  source: RecordingSource
): Promise<CaptureStream> {
  switch (source) {
    case 'system':
      return withLoopbackSilence(await capture.openDefault('render'))
    case 'voice':
      return capture.openDefault('capture')
    case 'both':
      return openMixed(capture)
  }
}

/**
 * El loopback sin huecos: un temporizador mete silencio cuando el equipo deja de sonar, así la
 * grabación sigue al reloj y la sesión en vivo no la da por parada.
 */
export function withLoopbackSilence(stream: CaptureStream): CaptureStream {
  const clock = new LoopbackClock(stream.sampleRate, Date.now())
  let data: (samples: Float32Array) => void = () => {}
  let error: (reason: string) => void = () => {}
  let stopped = false

  const emitSilence = (frames: number): void => {
    if (frames > 0) data(new Float32Array(frames * stream.channels))
  }
  const timer = setInterval(() => {
    if (!stopped) emitSilence(clock.tick(Date.now()))
  }, LOOPBACK_GAP_MS)
  const halt = (): void => {
    stopped = true
    clearInterval(timer)
  }

  stream.onData((samples) => {
    if (stopped) return
    emitSilence(clock.block(Date.now(), samples.length / stream.channels))
    data(samples)
  })
  stream.onError((reason) => {
    halt()
    error(reason)
  })

  return {
    sampleRate: stream.sampleRate,
    channels: stream.channels,
    onData: (listener) => {
      data = listener
    },
    onError: (listener) => {
      error = listener
    },
    stop: async () => {
      halt()
      await stream.stop()
    }
  }
}

/** Abre el micrófono tras el loopback; si falla, vuelve a cerrar el loopback. */
async function openBoth(capture: AudioCapture): Promise<[CaptureStream, CaptureStream]> {
  const system = await capture.openDefault('render')
  try {
    return [system, await capture.openDefault('capture')]
  } catch (error) {
    await system.stop().catch(() => {})
    throw error
  }
}

async function openMixed(capture: AudioCapture): Promise<CaptureStream> {
  const [system, voice] = await openBoth(capture)
  const master = withLoopbackSilence(system)
  const mixer = new Mixer(master, voice)
  let data: (samples: Float32Array) => void = () => {}
  let error: (reason: string) => void = () => {}
  let ended = false

  master.onData((samples) => {
    if (!ended) data(mixer.pushMaster(samples))
  })
  voice.onData((samples) => {
    if (!ended) mixer.pushSlave(samples)
  })

  const endBecause = (other: CaptureStream) => (reason: string) => {
    if (ended) return
    ended = true
    void other.stop().catch(() => {})
    error(reason)
  }
  master.onError(endBecause(voice))
  voice.onError(endBecause(master))

  return {
    sampleRate: master.sampleRate,
    channels: master.channels,
    onData: (listener) => {
      data = listener
    },
    onError: (listener) => {
      error = listener
    },
    stop: async () => {
      ended = true
      await Promise.all([master.stop(), voice.stop()])
    }
  }
}
