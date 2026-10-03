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

/** Caracteres que Windows no admite en un nombre de archivo. */
// eslint-disable-next-line no-control-regex
const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g
/** Nombres de dispositivo reservados, con o sin extensión. */
const RESERVED_NAME_RE = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i

/**
 * Nombre nuevo para el archivo `current` a partir de lo que escribió el usuario. Conserva la
 * extensión original (no se añade dos veces si ya la escribió), quita los caracteres que
 * Windows no admite y los puntos o espacios finales. `null` si no queda un nombre válido.
 */
export function renamedFileName(current: string, wanted: string): string | null {
  const dot = current.lastIndexOf('.')
  const ext = dot > 0 ? current.slice(dot) : ''
  let base = wanted.replace(INVALID_FILE_CHARS, '').trim()
  if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) base = base.slice(0, -ext.length)
  base = base.replace(/[. ]+$/, '')
  if (!base) return null
  const name = base + ext
  return RESERVED_NAME_RE.test(name) || name.length > 255 ? null : name
}
