import type { Segment } from '@shared/types'
import { normalize } from '@shared/normalize'

/**
 * Búsqueda en la transcripción (spec §4.1): sin distinguir mayúsculas ni tildes. Se compara
 * sobre el texto normalizado y se resalta sobre el original, así que cada carácter
 * normalizado recuerda de qué tramo del original viene.
 */

export { normalize }

export interface NormalizedText {
  text: string
  /** `starts[i]` y `ends[i]`: tramo del original del que sale el carácter `i` de `text`. */
  starts: number[]
  ends: number[]
}

/**
 * `normalize` con el mapa de índices normalizado → original. Va carácter a carácter del
 * original porque la normalización cambia longitudes: "É" pasa a "e" y la "İ" turca a dos
 * caracteres, y los emojis ocupan dos unidades UTF-16.
 */
export function normalizeWithMap(original: string): NormalizedText {
  let text = ''
  const starts: number[] = []
  const ends: number[] = []
  let i = 0
  for (const char of original) {
    const end = i + char.length
    const part = normalize(char)
    for (let k = 0; k < part.length; k++) {
      starts.push(i)
      ends.push(end)
    }
    text += part
    i = end
  }
  return { text, starts, ends }
}

/** Coincidencia en el texto original del segmento: `[start, end)`. */
export interface SearchMatch {
  segmentIndex: number
  start: number
  end: number
}

/**
 * Normalizado de cada segmento. Los segmentos no se mutan (el store copia al cambiar), así
 * que el objeto sirve de clave y cada búsqueda nueva no vuelve a normalizar miles de textos.
 */
const cache = new WeakMap<Segment, NormalizedText>()

function normalizedOf(segment: Segment): NormalizedText {
  let n = cache.get(segment)
  if (!n) {
    n = normalizeWithMap(segment.text)
    cache.set(segment, n)
  }
  return n
}

/** Consulta tal como se busca; vacía si no hay nada que buscar. */
export function normalizeQuery(query: string): string {
  return normalize(query.trim())
}

/**
 * Todas las coincidencias de `query` en orden, desde el segmento `from`. Dentro de un
 * segmento no se solapan ("aa" en "aaaa" da dos), como el buscar del navegador.
 */
export function findMatches(segments: readonly Segment[], query: string, from = 0): SearchMatch[] {
  const needle = normalizeQuery(query)
  const matches: SearchMatch[] = []
  if (!needle) return matches
  for (let s = from; s < segments.length; s++) {
    const n = normalizedOf(segments[s])
    let at = n.text.indexOf(needle)
    while (at !== -1) {
      const last = at + needle.length - 1
      matches.push({ segmentIndex: s, start: n.starts[at], end: n.ends[last] })
      at = n.text.indexOf(needle, at + needle.length)
    }
  }
  return matches
}

export interface SearchResult {
  segments: readonly Segment[]
  query: string
  matches: SearchMatch[]
}

/**
 * Coincidencias para `segments` y `query` reutilizando el resultado anterior. Si solo
 * llegaron segmentos al final (transcripción en vivo), busca solo en los nuevos; si cambió
 * la consulta o la lista (otro archivo, edición), vuelve a buscar en todo.
 */
export function updateSearch(
  prev: SearchResult | null,
  segments: readonly Segment[],
  query: string
): SearchResult {
  if (prev && prev.query === query) {
    if (prev.segments === segments) return prev
    if (isAppend(prev.segments, segments)) {
      const added = findMatches(segments, query, prev.segments.length)
      return {
        segments,
        query,
        matches: added.length ? prev.matches.concat(added) : prev.matches
      }
    }
  }
  return { segments, query, matches: findMatches(segments, query) }
}

/**
 * ¿`next` es `prev` con segmentos añadidos al final? Basta con mirar los extremos: durante
 * la transcripción el store solo añade con `concat`, y una edición (misma longitud, un
 * objeto nuevo en medio) no pasa por aquí.
 */
function isAppend(prev: readonly Segment[], next: readonly Segment[]): boolean {
  if (next.length <= prev.length) return false
  if (prev.length === 0) return true
  return next[0] === prev[0] && next[prev.length - 1] === prev[prev.length - 1]
}

/** Índice de la primera coincidencia del segmento `segmentIndex` o posterior. */
export function firstMatchAtOrAfter(matches: readonly SearchMatch[], segmentIndex: number): number {
  let lo = 0
  let hi = matches.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (matches[mid].segmentIndex < segmentIndex) lo = mid + 1
    else hi = mid
  }
  return lo
}
