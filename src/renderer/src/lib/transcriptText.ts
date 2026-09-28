import type { Segment } from '@shared/types'
import { paragraphText, toParagraphs } from '@shared/joinLines'
import { formatTimestamp } from './time'

/**
 * Texto de la transcripción tal como se ve: con "Unir líneas", párrafos separados por una
 * línea en blanco; sin él, un segmento por línea con su `[mm:ss]`.
 */
export function transcriptText(segments: readonly Segment[], joinLines: boolean): string {
  if (joinLines) {
    return toParagraphs(segments)
      .map((p) => paragraphText(segments, p))
      .filter(Boolean)
      .join('\n\n')
  }
  return segments.map((s) => `[${formatTimestamp(s.start)}] ${s.text.trim()}`).join('\n')
}
