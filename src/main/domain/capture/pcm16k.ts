/**
 * Lo que se graba, en el formato que transcribe la sesión en vivo (tarea 29): f32 intercalado
 * de N canales a la frecuencia de captura pasa a s16le mono a 16 kHz. El remuestreador guarda la
 * historia del filtro entre bloques, así que el `.pcm` suena igual se partan como se partan.
 */

import { BYTES_PER_SAMPLE, SAMPLE_RATE } from '../liveWindows'
import { Resampler } from './resampler'

const INT16_MAX = 32767
const MONO = 1

/** Media de los canales de cada muestra. */
export function downmixToMono(samples: Float32Array, channels: number): Float32Array {
  if (channels === MONO) return samples
  const frames = samples.length / channels
  const mono = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) sum += samples[frame * channels + channel]
    mono[frame] = sum / channels
  }
  return mono
}

/** Muestras de 16 bits little-endian, recortadas a -1..1. */
export function floatToS16le(samples: Float32Array): Buffer {
  const bytes = Buffer.alloc(samples.length * BYTES_PER_SAMPLE)
  for (let i = 0; i < samples.length; i++) {
    const clipped = Math.max(-1, Math.min(1, samples[i]))
    bytes.writeInt16LE(Math.round(clipped * INT16_MAX), i * BYTES_PER_SAMPLE)
  }
  return bytes
}

export class Pcm16kConverter {
  private readonly resampler: Resampler

  constructor(
    inRate: number,
    private readonly channels: number
  ) {
    this.resampler = new Resampler({ inRate, outRate: SAMPLE_RATE, channels: MONO })
  }

  /** Los bytes del bloque siguiente; los últimos esperan al bloque de después. */
  convert(samples: Float32Array): Buffer {
    return floatToS16le(this.resampler.process(downmixToMono(samples, this.channels)))
  }

  /** Los bytes que el filtro aún retenía, al terminar. */
  flush(): Buffer {
    return floatToS16le(this.resampler.flush())
  }
}
