import type { HistoryEntry, Segment } from '@shared/types'
import { isRecord } from './guards'
import { isSpeakerNames } from './speakers/speakerNames'

/** Los ids forman nombres de archivo: nada de separadores ni `..`. */
const ID_RE = /^[\w-]{1,64}$/

/** Lo que se pasa al crear: `id`, `createdAt` y `status` tienen valor por defecto. */
export type NewHistoryEntry = Omit<HistoryEntry, 'id' | 'createdAt' | 'status'> &
  Partial<Pick<HistoryEntry, 'id' | 'createdAt' | 'status'>>

export type HistoryPatch = Partial<Omit<HistoryEntry, 'id'>>

export function isValidHistoryId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    isValidHistoryId(value.id) &&
    typeof value.filePath === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.createdAt === 'number'
  )
}

export function isSegment(value: unknown): value is Segment {
  return (
    isRecord(value) &&
    typeof value.start === 'number' &&
    typeof value.end === 'number' &&
    typeof value.text === 'string'
  )
}

/**
 * Normaliza una entrada leída de disco. Una transcripción que quedó a medias (la app se
 * cerró o se colgó) vuelve a `pending`: la cola (tarea 17) decide si retomarla.
 */
export function restoreEntry(entry: HistoryEntry): HistoryEntry {
  const restored = { ...entry }
  delete restored.progress
  // Una sesión en vivo cortada por cerrar la app no se puede retomar: queda lo transcrito.
  if (restored.live) {
    delete restored.live
    restored.status = 'done'
  }
  if (restored.status === 'transcribing') restored.status = 'pending'
  // Antes de la tarea 35 no había hablantes; un mapa dañado se descarta entero.
  if (restored.speakers !== undefined && !isSpeakerNames(restored.speakers)) {
    delete restored.speakers
  }
  return restored
}

/** `progress` es solo de memoria: no se guarda. */
export function persistedEntry(entry: HistoryEntry): HistoryEntry {
  const stored = { ...entry }
  delete stored.progress
  return stored
}
