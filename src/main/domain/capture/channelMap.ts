/**
 * Cambia el número de canales de PCM f32 intercalado, para sumar el micrófono al loopback
 * (tarea 29, de Rebecca Listen): mono va a todos los canales, varios a mono se promedian y, si
 * no, se copian los canales comunes y los de más quedan en silencio.
 */

export function remapChannels(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples
  const frames = samples.length / from
  const out = new Float32Array(frames * to)
  for (let frame = 0; frame < frames; frame++) {
    const inBase = frame * from
    const outBase = frame * to
    if (from === 1) {
      out.fill(samples[inBase], outBase, outBase + to)
    } else if (to === 1) {
      let sum = 0
      for (let channel = 0; channel < from; channel++) sum += samples[inBase + channel]
      out[outBase] = sum / from
    } else {
      for (let channel = 0; channel < Math.min(from, to); channel++) {
        out[outBase + channel] = samples[inBase + channel]
      }
    }
  }
  return out
}
