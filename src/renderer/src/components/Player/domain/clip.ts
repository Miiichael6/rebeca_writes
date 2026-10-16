import { formatClock } from '@renderer/lib/time'

/** Tramo más corto que se puede recortar (el main lo vuelve a comprobar). */
export const MIN_CLIP_SEC = 0.5

/**
 * Lee un tiempo escrito a mano: `ss`, `m:ss` o `h:mm:ss`, con decimales opcionales en los
 * segundos (`1:02.5`). `null` si no se entiende.
 */
export function parseClock(text: string): number | null {
  const parts = text.trim().replace(',', '.').split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  const values = parts.map(Number)
  if (values.slice(1).some((v) => v >= 60)) return null
  return values.reduce((total, v) => total * 60 + v, 0)
}

/** Tiempo para el campo del diálogo: el del reproductor (`m:ss`, `h:mm:ss`). */
export const clockText = formatClock

export type ClipRangeError = 'format' | 'order' | 'beyond'

/** Qué falla en el tramo escrito, o `null` si se puede recortar. */
export function clipRangeError(
  start: number | null,
  end: number | null,
  duration: number
): ClipRangeError | null {
  if (start === null || end === null) return 'format'
  if (end - start < MIN_CLIP_SEC) return 'order'
  if (duration > 0 && start >= duration) return 'beyond'
  return null
}
