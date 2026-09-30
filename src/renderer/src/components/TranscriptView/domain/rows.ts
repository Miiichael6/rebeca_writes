import { firstMatchAtOrAfter, type SearchMatch } from '@renderer/lib/search'

/** Coincidencias de un tramo de segmentos `[from, to)`: son las `[first, end)` de la lista global. */
export interface MatchRange {
  first: number
  end: number
}

export function rowMatchRange(
  matches: readonly SearchMatch[],
  from: number,
  to: number
): MatchRange {
  return { first: firstMatchAtOrAfter(matches, from), end: firstMatchAtOrAfter(matches, to) }
}

/**
 * Índice global de la coincidencia actual si cae en `[first, end)`, si no -1. Solo la fila que
 * la contiene la recibe: así `memo` no repinta las demás al navegar la búsqueda.
 */
export function currentInRange(current: number, first: number, end: number): number {
  return current >= first && current < end ? current : -1
}

/** El índice si cae en `[from, to)`, si no -1. Sirve para el segmento activo y el que se edita. */
export function indexInRange(index: number | null, from: number, to: number): number {
  return index !== null && index >= from && index < to ? index : -1
}
