import type { Segment } from '@shared/types'
import { findActiveSegment } from '@renderer/lib/segments'

/**
 * Texto del subtítulo en el instante `time`. En los silencios no hay ninguno: el subtítulo
 * solo dura lo que dura su segmento.
 */
export function captionAt(segments: readonly Segment[], time: number): string | null {
  const i = findActiveSegment(segments, time)
  return i !== null && time < segments[i].end ? segments[i].text : null
}

/** Teclas que saltan en la barra de posición, con su signo. `0` si no es ninguna. */
export function seekKeyDirection(key: string): -1 | 0 | 1 {
  if (key === 'ArrowLeft') return -1
  if (key === 'ArrowRight') return 1
  return 0
}
