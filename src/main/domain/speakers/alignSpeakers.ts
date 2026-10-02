/**
 * Turnos de habla conocidos de antemano (tarea 35), p. ej. cuándo sonaba el micrófono propio en
 * *Ambos*: a cada segmento de whisper le toca el hablante que más tiempo cubre su intervalo.
 */

/** Un tramo de la grabación (segundos) en el que habla `speaker`. */
export interface SpeakerTurn {
  start: number
  end: number
  speaker: string
}

/** Parte mínima del segmento que tiene que cubrir un hablante para quedárselo. */
export const MIN_SPEAKER_SHARE = 0.5

/**
 * El hablante que cubre más tiempo de `[start, end]`, si llega a `minShare` del segmento;
 * `null` si ninguno (o el segmento no dura nada). `turns` va ordenado por `start`.
 */
export function dominantSpeaker(
  turns: readonly SpeakerTurn[],
  start: number,
  end: number,
  minShare = MIN_SPEAKER_SHARE
): string | null {
  const length = end - start
  if (length <= 0) return null
  const covered = new Map<string, number>()
  for (const turn of turns) {
    if (turn.start >= end) break
    const overlap = Math.min(end, turn.end) - Math.max(start, turn.start)
    if (overlap > 0) covered.set(turn.speaker, (covered.get(turn.speaker) ?? 0) + overlap)
  }
  let best: string | null = null
  let bestTime = minShare * length
  for (const [speaker, time] of covered) {
    if (time >= bestTime) {
      best = speaker
      bestTime = time
    }
  }
  return best
}
