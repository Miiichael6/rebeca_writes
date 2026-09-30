/** Coincidencia actual al empezar una consulta: la primera, o -1 si no hay. */
export function firstCursor(count: number): number {
  return count > 0 ? 0 : -1
}

/** Conserva la actual tras cambiar la lista de coincidencias, sin salirse de ella. */
export function clampCursor(current: number, count: number): number {
  const last = count - 1
  return last < 0 ? -1 : Math.min(Math.max(current, 0), last)
}

/** Siguiente (+1) o anterior (-1), con vuelta al principio o al final. */
export function stepCursor(current: number, delta: 1 | -1, count: number): number {
  if (count === 0) return -1
  return current < 0 ? 0 : (current + delta + count) % count
}
