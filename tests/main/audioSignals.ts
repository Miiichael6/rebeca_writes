/** Señales conocidas para los tests de captura: f32 intercalado, el mismo valor en cada canal. */

export function sine(
  freq: number,
  amp: number,
  seconds: number,
  rate: number,
  channels: number
): Float32Array {
  const frames = Math.round(seconds * rate)
  const out = new Float32Array(frames * channels)
  for (let frame = 0; frame < frames; frame++) {
    const value = amp * Math.sin((2 * Math.PI * freq * frame) / rate)
    for (let channel = 0; channel < channels; channel++) out[frame * channels + channel] = value
  }
  return out
}

export function rms(samples: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}

export function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
