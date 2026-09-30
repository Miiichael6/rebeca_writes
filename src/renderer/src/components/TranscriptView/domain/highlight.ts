import type { SearchMatch } from '@renderer/lib/search'

/** Trozo de texto; `match` es el índice global de la coincidencia, o `null` si es texto suelto. */
export interface HighlightPart {
  text: string
  match: number | null
}

/**
 * Parte el texto de un segmento en trozos sueltos y coincidencias. Las coincidencias del
 * segmento son las `count` a partir de `first` en la lista global.
 */
export function splitHighlight(
  text: string,
  matches: readonly SearchMatch[],
  first: number,
  count: number
): HighlightPart[] {
  if (count === 0) return [{ text, match: null }]
  const parts: HighlightPart[] = []
  let pos = 0
  for (let i = first; i < first + count; i++) {
    const m = matches[i]
    if (m.start > pos) parts.push({ text: text.slice(pos, m.start), match: null })
    parts.push({ text: text.slice(m.start, m.end), match: i })
    pos = m.end
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), match: null })
  return parts
}
