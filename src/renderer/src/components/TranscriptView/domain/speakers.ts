import { OWN_SPEAKER_ID, personNumber } from '@shared/speakers'
import type { Segment } from '@shared/types'

/** Colores de persona en `app.css` (`--speaker-1`…); a partir de ahí se repiten. */
export const SPEAKER_COLORS = 6

/**
 * Hablante del segmento `index` si con él empieza a hablar alguien distinto del último que
 * habló (tarea 35); `null` si sigue la misma voz o el segmento no tiene hablante. Así la
 * etiqueta solo aparece al cambiar de voz.
 */
export function speakerTurnAt(segments: readonly Segment[], index: number): string | null {
  const speaker = segments[index]?.speaker
  if (speaker === undefined) return null
  for (let i = index - 1; i >= 0; i--) {
    const previous = segments[i].speaker
    if (previous !== undefined) return previous === speaker ? null : speaker
  }
  return speaker
}

/** Lo mismo para un tramo `[from, to)` (un párrafo): mira su primer segmento con hablante. */
export function speakerTurnIn(
  segments: readonly Segment[],
  from: number,
  to: number
): string | null {
  for (let i = from; i < to; i++) {
    if (segments[i].speaker !== undefined) return speakerTurnAt(segments, i)
  }
  return null
}

/** Color de la etiqueta: 0 para "Usted" y de 1 a `SPEAKER_COLORS` para las personas. */
export function speakerColor(id: string): number {
  if (id === OWN_SPEAKER_ID) return 0
  const n = personNumber(id) ?? 1
  return ((n - 1) % SPEAKER_COLORS) + 1
}
