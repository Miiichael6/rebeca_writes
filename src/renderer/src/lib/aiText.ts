import type { Segment } from '@shared/types'
import { isNonSpeechText, speakerPrefix, type SpeakerNames } from '@shared/speakers'
import { formatTimestamp } from './time'

/**
 * "Copiar para IA" (tarea 38): la transcripción compacta para pegarla en Claude u otra IA sin
 * gastar tokens de más. Solo cambia lo que se copia; la transcripción guardada no se toca.
 */

/** Una palabra, frase o segmento que se repite seguido más de estas veces se deja una sola vez. */
export const MAX_REPEATS = 5
/** Largo máximo (en palabras) de la frase repetida que se busca. */
const MAX_PHRASE_WORDS = 12

/** Marcas de whisper que no son habla: `[BLANK_AUDIO]`, `(música)`, `*risas*`, `♪`. */
const NON_SPEECH_MARK_RE = /\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|[♪♫♬🎵🎶]+/gu

/** Quita las marcas de no habla y deja los espacios simples. */
export function stripNonSpeech(text: string): string {
  return text.replace(NON_SPEECH_MARK_RE, ' ').replace(/\s+/g, ' ').trim()
}

/** Forma de comparar dos palabras: sin mayúsculas ni puntuación. */
function normWord(word: string): string {
  const norm = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  return norm || word
}

/** ¿Las `n` palabras desde `a` son las mismas que las `n` desde `b`? */
function sameRun(norm: readonly string[], a: number, b: number, n: number): boolean {
  for (let k = 0; k < n; k++) if (norm[a + k] !== norm[b + k]) return false
  return true
}

/**
 * Deja una sola vez cada palabra o frase que se repite seguida más de `MAX_REPEATS` veces
 * ("no no no no no no" → "no"). Las repeticiones de hasta `MAX_REPEATS` se respetan.
 */
export function collapseRepeats(text: string, maxRepeats = MAX_REPEATS): string {
  const words = text.split(/\s+/).filter(Boolean)
  const norm = words.map(normWord)
  const out: string[] = []
  let i = 0
  while (i < words.length) {
    let skipped = false
    for (let n = 1; n <= MAX_PHRASE_WORDS && i + n * (maxRepeats + 1) <= words.length; n++) {
      let count = 1
      while (i + (count + 1) * n <= words.length && sameRun(norm, i, i + count * n, n)) count++
      if (count > maxRepeats) {
        out.push(...words.slice(i, i + n))
        i += count * n
        skipped = true
        break
      }
    }
    if (!skipped) out.push(words[i++])
  }
  return out.join(' ')
}

/** Quita los segmentos sin habla y deja uno de cada racha de segmentos iguales demasiado larga. */
function cleanSegments(segments: readonly Segment[], maxRepeats: number): Segment[] {
  const spoken = segments.flatMap((s) => {
    if (isNonSpeechText(s.text)) return []
    const text = stripNonSpeech(s.text)
    return text ? [{ ...s, text }] : []
  })
  const out: Segment[] = []
  let i = 0
  while (i < spoken.length) {
    const key = spoken[i].text.toLowerCase()
    let j = i + 1
    while (j < spoken.length && spoken[j].text.toLowerCase() === key) j++
    if (j - i > maxRepeats) out.push(spoken[i])
    else out.push(...spoken.slice(i, j))
    i = j
  }
  return out
}

/**
 * Texto para IA: una línea por segmento con su marca de tiempo, como la copia normal, pero sin
 * marcas de no habla ni bucles de repetición. Con hablantes, el nombre solo aparece cuando cambia.
 */
export function aiText(
  segments: readonly Segment[],
  speakerNames?: SpeakerNames,
  maxRepeats = MAX_REPEATS
): string {
  const lines: string[] = []
  let lastSpeaker: string | undefined
  for (const s of cleanSegments(segments, maxRepeats)) {
    const text = collapseRepeats(s.text, maxRepeats)
    if (!text) continue
    const prefix = s.speaker !== lastSpeaker ? speakerPrefix(s.speaker, speakerNames) : ''
    if (s.speaker !== undefined) lastSpeaker = s.speaker
    lines.push(`[${formatTimestamp(s.start)}] ${prefix}${text}`)
  }
  return lines.join('\n')
}
