import type { DictionaryEntry } from '@shared/dictionary'
import { normalize } from '@shared/normalize'

/** Con más palabras que esto, la tabla muestra el buscador. */
export const SEARCH_THRESHOLD = 8

/** Palabras de una frase como las compara el diccionario: sin mayúsculas, tildes ni puntuación. */
const WORD = /[\p{L}\p{N}_]+/gu

/** Clave de comparación: «Kiu-ei» y «kiu ei» son la misma forma hablada. */
export function formKey(text: string): string {
  return (normalize(text).match(WORD) ?? []).join(' ')
}

export function emptyEntry(id: string): DictionaryEntry {
  return { id, spoken: [], written: '', plural: false, enabled: true }
}

/** Tiene qué buscar y qué poner: solo estas se guardan (las demás son borradores de la tabla). */
export function isComplete(entry: DictionaryEntry): boolean {
  return entry.written.trim() !== '' && entry.spoken.some((s) => formKey(s) !== '')
}

export function savableEntries(entries: readonly DictionaryEntry[]): DictionaryEntry[] {
  return entries.filter(isComplete)
}

/**
 * Entrada que ya usa la forma hablada `form` (otra distinta de `exceptId`), o `undefined`. Una
 * forma en dos entradas sería ambigua: el diccionario solo aplicaría una.
 */
export function ownerOfForm(
  entries: readonly DictionaryEntry[],
  form: string,
  exceptId?: string
): DictionaryEntry | undefined {
  const key = formKey(form)
  return entries.find((e) => e.id !== exceptId && e.spoken.some((s) => formKey(s) === key))
}

/** Añade `form` a la entrada si es nueva en ella; vacío o repetido la deja igual. */
export function addSpoken(entry: DictionaryEntry, form: string): DictionaryEntry {
  const text = form.trim()
  const key = formKey(text)
  if (!key || entry.spoken.some((s) => formKey(s) === key)) return entry
  return { ...entry, spoken: [...entry.spoken, text] }
}

/** Entradas que contienen `query` en lo que se escucha o en lo que se escribe. */
export function filterEntries(
  entries: readonly DictionaryEntry[],
  query: string
): readonly DictionaryEntry[] {
  const needle = normalize(query.trim())
  if (!needle) return entries
  return entries.filter(
    (e) =>
      normalize(e.written).includes(needle) || e.spoken.some((s) => normalize(s).includes(needle))
  )
}
