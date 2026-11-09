import type { DictionaryEntry } from '@shared/dictionary'

/** Puerto de salida: dónde se guarda el diccionario de reemplazos (tarea 41). */
export interface DictionaryRepository {
  /** Lee el archivo una sola vez; después devuelve lo que hay en memoria. */
  load(): Promise<DictionaryEntry[]>
  /** Valida y guarda la lista completa; devuelve la que quedó. */
  save(entries: unknown): Promise<DictionaryEntry[]>
}
