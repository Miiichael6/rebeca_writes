import type { RecordingSource } from '@shared/recording'
import { FormatAdapter } from '../domain/capture/formatAdapter'
import { LOOPBACK_GAP_MS, LoopbackClock } from '../domain/capture/loopbackSilence'
import { Mixer, type MixObserver } from '../domain/capture/mixer'
import type { AudioCapture, CaptureStream } from './ports/audioCapture'

/**
 * Las tres fuentes de grabación (tarea 29) como un solo `CaptureStream`: Computadora es el
 * loopback con sus silencios rellenados, Mi voz es el micrófono tal cual y Ambos es la mezcla de
 * los dos, con el loopback como reloj. Si se pierde la salida (p. ej. al desconectar los
 * audífonos) se sigue con la nueva predeterminada; perder el micrófono termina el stream.
 * `micId` es el micrófono elegido; sin él (o si ya no está), el predeterminado de Windows.
 * `observeMix` ve en *Ambos* cada bloque del sistema y del micrófono antes de sumarlos.
 */
export async function openRecordingSource(
  capture: AudioCapture,
  source: RecordingSource,
  micId?: string,
  observeMix?: MixObserver
): Promise<CaptureStream> {
  switch (source) {
    case 'system':
      return withLoopbackSilence(await followDefaultOutput(capture))
    case 'voice':
      return capture.open('capture', micId)
    case 'both':
      return openMixed(capture, micId, observeMix)
  }
}

/** Reintentos para reabrir la salida: Windows tarda un momento en elegir la nueva predeterminada. */
export const REOPEN_ATTEMPTS = 10
export const REOPEN_DELAY_MS = 200

/**
 * El loopback de la salida predeterminada, siguiéndola: si el dispositivo se pierde, abre el que
 * Windows ponga en su lugar y adapta su audio al formato del primero. Solo termina si no queda
 * ninguna salida que abrir (o se cae el sidecar). El hueco mientras se reabre lo rellena
 * `withLoopbackSilence`.
 */
export async function followDefaultOutput(capture: AudioCapture): Promise<CaptureStream> {
  const first = await capture.open('render')
  const format = { sampleRate: first.sampleRate, channels: first.channels }
  let current = first
  let data: (samples: Float32Array) => void = () => {}
  let error: (reason: string) => void = () => {}
  let stopped = false

  const attach = (stream: CaptureStream): void => {
    const adapter = stream === first ? null : new FormatAdapter(stream, format)
    stream.onData((samples) => {
      if (!stopped && stream === current) data(adapter ? adapter.convert(samples) : samples)
    })
    stream.onError((reason) => {
      if (!stopped && stream === current) void replace(reason)
    })
  }

  const reopen = async (): Promise<CaptureStream | null> => {
    for (let attempt = 0; attempt < REOPEN_ATTEMPTS && !stopped; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, REOPEN_DELAY_MS))
      if (stopped) return null
      try {
        return await capture.open('render')
      } catch {
        // Aún no hay salida predeterminada: se vuelve a probar.
      }
    }
    return null
  }

  const replace = async (reason: string): Promise<void> => {
    if (reason === 'sidecar_ended') return error(reason)
    const next = await reopen()
    if (stopped) {
      await next?.stop().catch(() => {})
      return
    }
    if (!next) return error(reason)
    current = next
    attach(next)
  }

  attach(first)
  return {
    ...format,
    onData: (listener) => {
      data = listener
    },
    onError: (listener) => {
      error = listener
    },
    stop: async () => {
      stopped = true
      await current.stop()
    }
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
async function openBoth(
  capture: AudioCapture,
  micId?: string
): Promise<[CaptureStream, CaptureStream]> {
  const system = await followDefaultOutput(capture)
  try {
    return [system, await capture.open('capture', micId)]
  } catch (error) {
    await system.stop().catch(() => {})
    throw error
  }
}

async function openMixed(
  capture: AudioCapture,
  micId?: string,
  observeMix?: MixObserver
): Promise<CaptureStream> {
  const [system, voice] = await openBoth(capture, micId)
  const master = withLoopbackSilence(system)
  const mixer = new Mixer(master, voice, observeMix)
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
