/**
 * Nivel de lo que se graba, para la onda junto al contador del botón de grabar (tarea 29).
 * Toma el pico de cada ventana de `LEVEL_WINDOW_MS` y lo pasa a 0..1 en escala de decibelios,
 * que es como se oye: una voz normal queda a media altura y el silencio en cero.
 */

export const LEVEL_WINDOW_MS = 50
/** Por debajo de esto cuenta como silencio. */
const FLOOR_DB = -50

/** Pico lineal (0..1) a nivel en escala de dB (0..1). */
export function peakToLevel(peak: number): number {
  if (peak <= 0) return 0
  const db = 20 * Math.log10(Math.min(1, peak))
  return Math.max(0, (db - FLOOR_DB) / -FLOOR_DB)
}

export class LevelMeter {
  private readonly windowFrames: number
  private frames = 0
  private peak = 0

  constructor(
    sampleRate: number,
    private readonly channels: number
  ) {
    this.windowFrames = Math.max(1, Math.round((sampleRate * LEVEL_WINDOW_MS) / 1000))
  }

  /** Muestras intercaladas; devuelve un nivel por cada ventana completada en este bloque. */
  push(samples: Float32Array): number[] {
    const levels: number[] = []
    for (let i = 0; i < samples.length; i++) {
      const value = Math.abs(samples[i])
      if (value > this.peak) this.peak = value
      if ((i + 1) % this.channels !== 0) continue
      if (++this.frames < this.windowFrames) continue
      levels.push(peakToLevel(this.peak))
      this.frames = 0
      this.peak = 0
    }
    return levels
  }
}
