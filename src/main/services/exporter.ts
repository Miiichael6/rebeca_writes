import { access } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { dialog, shell, type BrowserWindow } from 'electron'
import {
  baseName,
  EXPORT_EXTENSIONS,
  EXPORT_FORMATS,
  exportTranscript,
  srtFileName,
  srtLanguage,
  toSrt,
  type ExportFormat
} from '@shared/exporters'
import type { ExportSaved, SaveSrtBesideResult, Segment } from '@shared/types'
import { writeTextAtomic } from './fsAtomic'
import { history } from './history'
import { isValidHistoryId } from './historyStore'
import { isSafeMediaPath } from './mediaRegistry'

/**
 * Menú Exportar (tarea 20): "Guardar como" en los 5 formatos y el `.srt` junto al archivo,
 * que también usa la cola al terminar cada trabajo. Todo en UTF-8 sin BOM: el Bloc de notas
 * de Windows 10/11 detecta UTF-8 sin él, y un BOM confunde a algunos reproductores de .srt.
 */

/** Rutas escritas en esta sesión: las únicas que "Mostrar en el Explorador" acepta. */
const exported = new Set<string>()

function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

/** Los segmentos vienen del renderer: se quedan solo los que tienen la forma correcta. */
function toSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) throw new Error('Segmentos inválidos')
  return value
    .filter(
      (s): s is Segment =>
        typeof s === 'object' &&
        s !== null &&
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        typeof s.text === 'string'
    )
    .map(({ start, end, text }) => ({ start, end, text }))
}

function isFormat(value: unknown): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat)
}

async function entryFor(id: unknown): Promise<{ filePath: string; fileName: string } | null> {
  if (!isValidHistoryId(id)) return null
  const saved = await history().get(id)
  return saved && isSafeMediaPath(saved.entry.filePath) ? saved.entry : null
}

/** `export:save`: diálogo "Guardar como" en la carpeta del original y con su nombre. */
export async function saveExport(
  window: BrowserWindow | null,
  entryId: unknown,
  format: unknown,
  segments: unknown,
  options: unknown,
  filterLabel: unknown
): Promise<ExportSaved | null> {
  if (!isFormat(format)) throw new Error('Formato de exportación inválido')
  const list = toSegments(segments)
  const entry = await entryFor(entryId)
  if (!entry) return null
  const ext = EXPORT_EXTENSIONS[format]
  const saveOptions = {
    defaultPath: join(dirname(entry.filePath), `${baseName(entry.fileName)}.${ext}`),
    filters: [{ name: typeof filterLabel === 'string' ? filterLabel : ext, extensions: [ext] }]
  }
  const result = window
    ? await dialog.showSaveDialog(window, saveOptions)
    : await dialog.showSaveDialog(saveOptions)
  if (result.canceled || !result.filePath) return null
  const joined = (options as { joined?: unknown } | null)?.joined === true
  await writeTextAtomic(result.filePath, exportTranscript(format, list, { joined }))
  exported.add(result.filePath)
  return { path: result.filePath }
}

/**
 * Escribe `<archivo>.<idioma>.srt` junto a `filePath`. Sin `overwrite` no pisa uno existente
 * y devuelve `exists`. Lo usan el menú Exportar y la cola ("guardar el .srt al terminar").
 */
export async function writeSrtBeside(
  filePath: string,
  language: string,
  segments: readonly Segment[],
  overwrite: boolean
): Promise<SaveSrtBesideResult> {
  if (!(await exists(filePath))) return { status: 'missing' }
  const path = join(dirname(filePath), srtFileName(basename(filePath), language))
  if (!overwrite && (await exists(path))) return { status: 'exists', path }
  await writeTextAtomic(path, toSrt(segments))
  exported.add(path)
  return { status: 'saved', path }
}

/** `export:saveSrtBeside`: la ruta y el idioma salen del historial, no del renderer. */
export async function saveSrtBesideEntry(
  entryId: unknown,
  segments: unknown,
  overwrite: unknown
): Promise<SaveSrtBesideResult> {
  const list = toSegments(segments)
  if (!isValidHistoryId(entryId)) return { status: 'missing' }
  const saved = await history().get(entryId)
  if (!saved || !isSafeMediaPath(saved.entry.filePath)) return { status: 'missing' }
  return writeSrtBeside(saved.entry.filePath, srtLanguage(saved.entry), list, overwrite === true)
}

/** `export:showInFolder`: solo archivos que se exportaron en esta sesión. */
export function showExportInFolder(path: unknown): void {
  if (typeof path === 'string' && exported.has(path)) shell.showItemInFolder(path)
}
