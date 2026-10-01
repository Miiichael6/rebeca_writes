import { remapChannels } from './channelMap'
import { Resampler } from './resampler'

export interface AudioFormat {
  sampleRate: number
  channels: number
}

/**
 * Pasa PCM f32 intercalado de un formato a otro (tarea 29): cuando la salida predeterminada
 * cambia a mitad de grabación, el dispositivo nuevo se adapta al formato con el que empezó, así
 * el resto de la cadena no nota el cambio.
 */
export class FormatAdapter {
  private readonly resampler: Resampler | null

  constructor(
    private readonly from: AudioFormat,
    private readonly to: AudioFormat
  ) {
    this.resampler =
      from.sampleRate === to.sampleRate
        ? null
        : new Resampler({ inRate: from.sampleRate, outRate: to.sampleRate, channels: to.channels })
  }

  convert(samples: Float32Array): Float32Array {
    const remapped = remapChannels(samples, this.from.channels, this.to.channels)
    return this.resampler ? this.resampler.process(remapped) : remapped
  }
}
