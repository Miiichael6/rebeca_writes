/**
 * "Ambos a la vez" (tarea 29, de `mixer.ts` de Rebecca Listen): el loopback y el micrófono
 * sumados en un solo flujo. El loopback marca el reloj: cada bloque suyo toma las mismas
 * muestras de micrófono y sale mezclado. El micrófono se lleva a la frecuencia y los canales del
 * loopback y espera en una FIFO entre medias.
 *
 * Una FIFO vacía se rellena con ceros y una desbordada tira lo más viejo; en los dos casos
 * vuelve a `MIX_FIFO_TARGET_MS`. A diferencia de Listen no se sigue la deriva entre los dos
 * relojes: para transcribir basta con que esa corrección ocasional no se oiga.
 */

import { remapChannels } from './channelMap'
import { SampleFifo } from './fifo'
import { softLimitInPlace } from './limiter'
import { Resampler } from './resampler'

/** Colchón de micrófono que se mantiene en la FIFO contra bloques desiguales. */
export const MIX_FIFO_TARGET_MS = 20
/** Lo más que puede adelantarse el micrófono antes de tirar muestras. */
export const MIX_FIFO_MAX_MS = 200
const MS_PER_S = 1000

export interface StreamFormat {
  sampleRate: number
  channels: number
}

/** Ve cada bloque del loopback y el de micrófono que se le suma, antes de mezclarlos. */
export type MixObserver = (master: Float32Array, slave: Float32Array) => void

export class Mixer {
  private readonly resampler: Resampler
  private readonly fifo: SampleFifo
  private readonly targetFrames: number
  private scratch = new Float32Array(0)
  /** Aún no llegó micrófono: la mezcla es solo el loopback y una FIFO vacía no es un hueco. */
  private primed = false

  constructor(
    private readonly master: StreamFormat,
    private readonly slave: StreamFormat,
    private readonly observe?: MixObserver
  ) {
    this.resampler = new Resampler({
      inRate: slave.sampleRate,
      outRate: master.sampleRate,
      channels: slave.channels
    })
    this.targetFrames = this.msToFrames(MIX_FIFO_TARGET_MS)
    this.fifo = new SampleFifo(master.channels, this.msToFrames(MIX_FIFO_MAX_MS))
  }

  /** Un bloque de micrófono: convertido y en cola para los próximos bloques del loopback. */
  pushSlave(samples: Float32Array): void {
    const converted = remapChannels(
      this.resampler.process(samples),
      this.slave.channels,
      this.master.channels
    )
    if (!this.primed) {
      this.primed = true
      this.prefill()
    }
    if (this.fifo.write(converted) > 0) this.fifo.discard(this.fifo.frames - this.targetFrames)
  }

  /** Un bloque de loopback: vuelve mezclado con el mismo largo de micrófono. */
  pushMaster(samples: Float32Array): Float32Array {
    const voice = this.takeSlave(samples.length)
    this.observe?.(samples, voice)
    const out = new Float32Array(samples.length)
    for (let i = 0; i < out.length; i++) out[i] = samples[i] + voice[i]
    softLimitInPlace(out)
    return out
  }

  /** Las próximas `length` muestras de micrófono, con ceros donde no hay. */
  private takeSlave(length: number): Float32Array {
    if (this.scratch.length !== length) this.scratch = new Float32Array(length)
    const missing = this.fifo.read(this.scratch)
    if (missing > 0 && this.primed) this.prefill()
    return this.scratch
  }

  /** Silencio delante del micrófono hasta el colchón. */
  private prefill(): void {
    const frames = this.targetFrames - this.fifo.frames
    if (frames > 0) this.fifo.write(new Float32Array(frames * this.master.channels))
  }

  private msToFrames(ms: number): number {
    return Math.round((ms / MS_PER_S) * this.master.sampleRate)
  }
}
