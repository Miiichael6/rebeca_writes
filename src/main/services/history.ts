import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log/main'
import type { HistoryEntry, HistoryEntryInput, Segment } from '@shared/types'
import { HistoryStore, isValidHistoryId } from './historyStore'

/** Instancia única del historial en `userData/history/`. El resto del IPC para el renderer llega en la tarea 18. */

let store: HistoryStore | null = null

export function history(): HistoryStore {
  store ??= new HistoryStore({
    dir: join(app.getPath('userData'), 'history'),
    onCorrupt: (backup, err) => log.error(`Historial corrupto; respaldado en ${backup}`, err)
  })
  return store
}

/** `history:create`: los datos vienen del renderer, así que se comprueban antes de guardarlos. */
export function createHistoryEntry(input: unknown): Promise<HistoryEntry> {
  const i = (input ?? {}) as Partial<Record<keyof HistoryEntryInput, unknown>>
  const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0
  if (!text(i.filePath) || !text(i.fileName) || !text(i.model) || !text(i.language)) {
    return Promise.reject(new Error('Entrada de historial inválida'))
  }
  const duration = Number(i.durationSec)
  return history().create({
    filePath: i.filePath,
    fileName: i.fileName,
    model: i.model,
    language: i.language,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : 0
  })
}

/** `history:updateSegment`: edición en línea de un segmento (tarea 16). */
export async function updateHistorySegment(
  id: unknown,
  index: unknown,
  text: unknown
): Promise<Segment | null> {
  if (!isValidHistoryId(id) || !Number.isInteger(index) || typeof text !== 'string') {
    throw new Error('Edición de segmento inválida')
  }
  return history().updateSegment(id, index as number, text)
}
