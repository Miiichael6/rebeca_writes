import type { HistoryEntry, Segment } from '@shared/types'
import type { HistoryPatch, NewHistoryEntry } from '../../domain/history'

/** Puerto de salida: dónde viven el historial de transcripciones y sus segmentos. */
export interface HistoryRepository {
  /** Entradas, de la más nueva a la más vieja. */
  list(): Promise<HistoryEntry[]>
  get(id: string): Promise<{ entry: HistoryEntry; segments: Segment[] } | null>
  create(input: NewHistoryEntry): Promise<HistoryEntry>
  /** Cambia campos de una entrada. `null` si no existe. */
  update(id: string, patch: HistoryPatch): Promise<HistoryEntry | null>
  /** Añade segmentos al final (durante la transcripción). Ignora ids que ya no existen. */
  appendSegments(id: string, segments: Segment[]): Promise<void>
  /** Reemplaza todos los segmentos (al empezar de nuevo, al terminar o al editar). */
  setSegments(id: string, segments: Segment[]): Promise<void>
  /**
   * Cambia el texto de un segmento y conserva el de whisper en `originalText` para poder
   * restaurarlo. Volver al texto original quita las marcas. `null` si no existe.
   */
  updateSegment(id: string, index: number, text: string): Promise<Segment | null>
  /** Ids de las entradas cuya transcripción contiene `query` (sin mayúsculas ni tildes). */
  search(query: string): Promise<string[]>
  remove(id: string): Promise<boolean>
  /** Borra todo el historial. Nunca toca los medios originales ni los `.srt` exportados. */
  clear(): Promise<void>
  /** Escribe ya todo lo pendiente. */
  flush(): Promise<void>
}
