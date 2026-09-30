import type { SearchMatch } from '@renderer/lib/search'
import { splitHighlight } from '../domain/highlight'

/** Texto del segmento con sus coincidencias en `<mark>`; la actual lleva otro color. */
export function renderHighlight(
  text: string,
  matches: readonly SearchMatch[],
  first: number,
  count: number,
  current: number
): React.ReactNode {
  if (count === 0) return text
  return splitHighlight(text, matches, first, count).map((part, i) =>
    part.match === null ? (
      part.text
    ) : (
      <mark key={i} className={part.match === current ? 'current' : undefined}>
        {part.text}
      </mark>
    )
  )
}
