import type { HistoryEntry } from '@shared/types'

/** Nombre que se ve en el historial: el que puso el usuario o el del archivo. */
export function shownName(entry: HistoryEntry): string {
  return entry.displayName ?? entry.fileName
}

/** Extensión del archivo con su punto (`.mp4`), o `''` si no tiene. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot) : ''
}

/** Mientras está en la cola, transcribiéndose o grabándose, el archivo no se puede renombrar. */
export function isFileBusy(entry: HistoryEntry): boolean {
  return entry.live === true || entry.status === 'pending' || entry.status === 'transcribing'
}

/** Clave estable para `useListExit`; fuera de los componentes para no recrearla en cada render. */
export const entryKey = (entry: HistoryEntry): string => entry.id

/** Diálogo abierto desde el menú contextual, sobre la entrada `entry`. */
export type EntryDialog =
  | { kind: 'rename'; entry: HistoryEntry }
  | { kind: 'remove'; entry: HistoryEntry }
  | { kind: 'retranscribe'; entry: HistoryEntry }
