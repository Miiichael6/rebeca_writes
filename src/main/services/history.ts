import { access } from 'fs/promises'
import { basename, join } from 'path'
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log/main'
import type { MediaFilterKey } from '@shared/formats'
import type {
  HistoryEntry,
  HistoryEntryInput,
  HistoryOpened,
  OpenedMedia,
  Segment
} from '@shared/types'
import { HistoryStore, isValidHistoryId } from './historyStore'
import { openMedia, pickMediaFile } from './mediaOpen'
import { isSafeMediaPath, unregisterMediaPath } from './mediaRegistry'
import { clearPreviewCache } from './previews'

/** Instancia única del historial en `userData/history/`. */

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

function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

/** `history:list` */
export function listHistoryEntries(): Promise<HistoryEntry[]> {
  return history().list()
}

/**
 * `history:get`: entrada y segmentos. El archivo solo se registra en `media://` si sigue en
 * su ruta; si no, `media` es `null` y el renderer muestra el aviso "no disponible".
 */
export async function getHistoryEntry(id: unknown): Promise<HistoryOpened | null> {
  if (!isValidHistoryId(id)) return null
  const saved = await history().get(id)
  if (!saved) return null
  const media =
    isSafeMediaPath(saved.entry.filePath) && (await exists(saved.entry.filePath))
      ? await openMedia(saved.entry.filePath)
      : null
  return { ...saved, media }
}

/** `history:search` */
export function searchHistoryEntries(query: unknown): Promise<string[]> {
  return typeof query === 'string' ? history().search(query) : Promise.resolve([])
}

/** `history:rename`: solo el nombre mostrado; el archivo no se toca. */
export async function renameHistoryEntry(
  id: unknown,
  displayName: unknown
): Promise<HistoryEntry | null> {
  if (!isValidHistoryId(id) || typeof displayName !== 'string') return null
  const trimmed = displayName.trim()
  return history().update(id, { displayName: trimmed || undefined })
}

/** `history:remove`: quita la entrada y saca su archivo de la lista blanca de `media://`. */
export async function removeHistoryEntry(id: unknown): Promise<boolean> {
  if (!isValidHistoryId(id)) return false
  const saved = await history().get(id)
  if (!saved) return false
  const removed = await history().remove(id)
  if (removed) unregisterMediaPath(saved.entry.filePath)
  return removed
}

/**
 * `history:clear`: borra `index.json`, los `<id>.json` y la caché de vistas previas. Los
 * medios originales y los .srt exportados no se tocan (spec §5).
 */
export async function clearHistoryEntries(): Promise<void> {
  const entries = await history().list()
  await history().clear()
  for (const entry of entries) unregisterMediaPath(entry.filePath)
  await clearPreviewCache()
}

/** `history:relocate`: "Buscar archivo..." para una entrada cuyo original se movió. */
export async function relocateHistoryEntry(
  window: BrowserWindow | null,
  id: unknown,
  filterLabels: Record<MediaFilterKey, string>
): Promise<{ entry: HistoryEntry; media: OpenedMedia } | null> {
  if (!isValidHistoryId(id) || !(await history().get(id))) return null
  const media = await pickMediaFile(window, filterLabels)
  if (!media) return null
  const entry = await history().update(id, {
    filePath: media.filePath,
    fileName: basename(media.filePath),
    ...(media.info ? { durationSec: media.info.durationSec } : {})
  })
  return entry ? { entry, media } : null
}

/** `history:showInFolder`: la ruta sale del historial, no del renderer. */
export async function showHistoryEntryInFolder(id: unknown): Promise<void> {
  const saved = isValidHistoryId(id) ? await history().get(id) : null
  if (saved && isSafeMediaPath(saved.entry.filePath)) shell.showItemInFolder(saved.entry.filePath)
}
