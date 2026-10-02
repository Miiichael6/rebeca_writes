import type { Segment } from './types'

/**
 * Párrafo de "Unir líneas": un tramo continuo de segmentos `[from, to)`. Guarda índices y no
 * texto para que la vista pueda resaltar y hacer clic a nivel de segmento dentro del párrafo.
 */
export interface Paragraph {
  /** `start` del primer segmento: a dónde salta el reproductor. */
  start: number
  end: number
  from: number
  to: number
}

export interface JoinOptions {
  /** Silencio entre dos segmentos (en segundos) a partir del cual empieza párrafo nuevo. */
  pauseSec?: number
  /** Frases completas por párrafo como máximo. */
  maxSentences?: number
}

/** Fin de frase: `.`, `!`, `?`, `…` (y sus variantes CJK), con comillas o paréntesis detrás. */
const SENTENCE_END = /[.!?…。！？]["'»”’)\]]*$/

export function endsSentence(text: string): boolean {
  return SENTENCE_END.test(text.trim())
}

/**
 * Agrupa los segmentos en párrafos. Corta cuando hay una pausa larga entre dos segmentos,
 * cuando el párrafo ya tiene `maxSentences` frases completas o cuando cambia quien habla.
 */
export function toParagraphs(
  segments: readonly Segment[],
  { pauseSec = 2, maxSentences = 5 }: JoinOptions = {}
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let current: Paragraph | null = null
  let sentences = 0
  let speaker: string | undefined
  segments.forEach((segment, i) => {
    const pause = current !== null && segment.start - current.end >= pauseSec
    const turn =
      segment.speaker !== undefined && speaker !== undefined && segment.speaker !== speaker
    if (current === null || pause || turn || sentences >= maxSentences) {
      current = { start: segment.start, end: segment.end, from: i, to: i + 1 }
      paragraphs.push(current)
      sentences = 0
    } else {
      current.end = Math.max(current.end, segment.end)
      current.to = i + 1
    }
    if (endsSentence(segment.text)) sentences++
    speaker = segment.speaker ?? speaker
  })
  return paragraphs
}

/** Texto del párrafo: los segmentos recortados y separados por un espacio. */
export function paragraphText(segments: readonly Segment[], paragraph: Paragraph): string {
  const parts: string[] = []
  for (let i = paragraph.from; i < paragraph.to; i++) {
    const text = segments[i].text.trim()
    if (text) parts.push(text)
  }
  return parts.join(' ')
}

/** Quién habla en el párrafo: el primer segmento con hablante. */
export function paragraphSpeaker(
  segments: readonly Segment[],
  paragraph: Paragraph
): string | undefined {
  for (let i = paragraph.from; i < paragraph.to; i++) {
    if (segments[i].speaker !== undefined) return segments[i].speaker
  }
  return undefined
}

/** Índice del párrafo que contiene el segmento `index` (búsqueda binaria), o -1. */
export function paragraphOf(paragraphs: readonly Paragraph[], index: number): number {
  let lo = 0
  let hi = paragraphs.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const p = paragraphs[mid]
    if (index < p.from) hi = mid - 1
    else if (index >= p.to) lo = mid + 1
    else return mid
  }
  return -1
}
