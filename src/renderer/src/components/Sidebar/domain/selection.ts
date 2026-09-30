/** Selección múltiple: `null` fuera del modo; dentro, los ids marcados. */
export type Checked = ReadonlySet<string> | null

/** Marca o desmarca `id`. Fuera del modo de selección no hace nada. */
export function toggleChecked(prev: Checked, id: string): Checked {
  if (!prev) return prev
  const next = new Set(prev)
  if (!next.delete(id)) next.add(id)
  return next
}

/** Los marcados que siguen a la vista: los que salen del filtro o del historial se descartan. */
export function visibleChecked(checked: Checked, visibleIds: ReadonlySet<string>): string[] {
  return checked ? [...checked].filter((id) => visibleIds.has(id)) : []
}
