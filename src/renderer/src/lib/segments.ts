import type { Segment } from '@shared/types'

/**
 * Índice del segmento que corresponde al instante `t` (segundos), o `null` si todavía no
 * empezó ninguno. Búsqueda binaria sobre `start`: los segmentos llegan ordenados de whisper.
 *
 * En los silencios entre dos segmentos devuelve el último que empezó, para que el resaltado
 * no parpadee; quien necesite saber si `t` cae dentro del tramo (los subtítulos) compara
 * con `end`.
 */
export function findActiveSegment(segments: readonly Segment[], t: number): number | null {
  let lo = 0
  let hi = segments.length - 1
  let found: number | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].start <= t) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}
