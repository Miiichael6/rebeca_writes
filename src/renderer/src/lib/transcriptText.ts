import type { Segment } from '@shared/types'
import { paragraphSpeaker, paragraphText, toParagraphs } from '@shared/joinLines'
import { speakerPrefix, type SpeakerNames } from '@shared/speakers'
import { formatTimestamp } from './time'

/**
 * Texto de la transcripción tal como se ve: con "Unir líneas", párrafos separados por una
 * línea en blanco; sin él, un segmento por línea con su `[mm:ss]`. Con `speakerNames`, cada
 * línea o párrafo lleva delante el nombre de quien habla (tarea 35).
 */
export function transcriptText(
  segments: readonly Segment[],
  joinLines: boolean,
  speakerNames?: SpeakerNames
): string {
  if (joinLines) {
    return toParagraphs(segments)
      .flatMap((p) => {
        const text = paragraphText(segments, p)
        return text ? [speakerPrefix(paragraphSpeaker(segments, p), speakerNames) + text] : []
      })
      .join('\n\n')
  }
  return segments
    .map(
      (s) =>
        `[${formatTimestamp(s.start)}] ${speakerPrefix(s.speaker, speakerNames)}${s.text.trim()}`
    )
    .join('\n')
}
