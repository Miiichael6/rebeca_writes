import { normalize } from '@shared/normalize'
import type { HistoryEntry } from '@shared/types'

/**
 * Entradas que pasan el filtro: por nombre (el mostrado, sin mayúsculas ni tildes) o porque su
 * transcripción contiene el texto (`textMatches`, de `history:search`).
 */
export function filterHistory(
  entries: HistoryEntry[],
  filter: string,
  textMatches: ReadonlySet<string> | null = null
): HistoryEntry[] {
  const q = normalize(filter.trim())
  if (!q) return entries
  return entries.filter(
    (e) => normalize(e.displayName ?? e.fileName).includes(q) || textMatches?.has(e.id)
  )
}
