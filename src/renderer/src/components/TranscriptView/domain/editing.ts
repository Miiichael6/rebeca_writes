/** Segmento que se está editando y lo escrito hasta ahora. */
export interface EditDraft {
  index: number
  draft: string
}

/**
 * Texto que se guarda al terminar la edición, o `null` si no hay nada que guardar: vacío
 * cuenta como cancelar, porque un segmento no se borra editándolo.
 */
export function committedText(draft: string): string | null {
  const text = draft.trim()
  return text === '' ? null : text
}
