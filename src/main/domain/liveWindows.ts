/**
 * Qué trozo del `.pcm` en vivo se transcribe cada vez (tarea 27). Lógica pura sobre las
 * muestras: sin ficheros ni procesos.
 *
 * Las ventanas no son fijas: cada vez que whisper queda libre se toma lo que ya llegó (como
 * mínimo `MIN_WINDOW_SEC`, como mucho `MAX_WINDOW_SEC`), cortando en el tramo más silencioso
 * del final para no partir una palabra. Así el primer texto llega pronto y, si whisper va
 * lento, las ventanas crecen solas hasta su ritmo.
 */

import type { Segment } from '@shared/types'

/** Formato que escribe Rebecca Listen: PCM s16le, 16 kHz, mono. */
export const SAMPLE_RATE = 16_000
export const BYTES_PER_SAMPLE = 2
export const BYTES_PER_SEC = SAMPLE_RATE * BYTES_PER_SAMPLE

export const MIN_WINDOW_SEC = 5
/** Lo que whisper procesa de una vez: más no le da más contexto. */
export const MAX_WINDOW_SEC = 30
/** Tramo del final de la ventana donde se busca dónde cortar. */
const CUT_SEARCH_SEC = 2
/** Resolución con la que se busca el silencio. */
const FRAME_SEC = 0.1
/** RMS por debajo del cual una ventana es silencio (≈ −45 dBFS): no se manda a whisper. */
const SILENCE_RMS = 180

const MIN_SAMPLES = MIN_WINDOW_SEC * SAMPLE_RATE
const MAX_SAMPLES = MAX_WINDOW_SEC * SAMPLE_RATE
const FRAME_SAMPLES = FRAME_SEC * SAMPLE_RATE

function rms(samples: Int16Array, from = 0, to = samples.length): number {
  if (to <= from) return 0
  let sum = 0
  for (let i = from; i < to; i++) sum += samples[i]! * samples[i]!
  return Math.sqrt(sum / (to - from))
}

/** Punto de corte en el tramo más silencioso de los últimos segundos de `samples[0, end)`. */
function quietestCut(samples: Int16Array, end: number): number {
  const searchFrom = end - Math.min(CUT_SEARCH_SEC * SAMPLE_RATE, Math.floor(end / 2))
  let best = end
  let bestEnergy = Infinity
  for (let frame = end - FRAME_SAMPLES; frame >= searchFrom; frame -= FRAME_SAMPLES) {
    const energy = rms(samples, frame, frame + FRAME_SAMPLES)
    if (energy < bestEnergy) {
      bestEnergy = energy
      best = frame + FRAME_SAMPLES / 2
    }
  }
  return best
}

/**
 * Cuántas muestras de `pending` (lo que llegó y aún no se transcribió) forman la siguiente
 * ventana, o `null` si hay que esperar más audio. Con la grabación terminada (`ended`) se
 * toma todo lo que queda.
 */
export function nextWindowLength(pending: Int16Array, ended: boolean): number | null {
  const available = pending.length
  if (available === 0) return null
  if (ended && available <= MAX_SAMPLES) return available
  if (available < MIN_SAMPLES) return null
  return quietestCut(pending, Math.min(available, MAX_SAMPLES))
}

/** La ventana no tiene voz: whisper solo inventaría texto ("Gracias por ver el video"). */
export function isSilent(window: Int16Array): boolean {
  return rms(window) < SILENCE_RMS
}

/** Los tiempos de whisper son relativos a la ventana: se pasan a tiempos de la grabación. */
export function shiftSegments(segments: readonly Segment[], offsetSec: number): Segment[] {
  return segments.map((s) => ({ ...s, start: s.start + offsetSec, end: s.end + offsetSec }))
}

/** Segundos de audio que hay en `bytes` del `.pcm`. */
export function pcmSeconds(bytes: number): number {
  return bytes / BYTES_PER_SEC
}
