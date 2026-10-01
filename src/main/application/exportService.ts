import { basename, dirname, join } from 'path'
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
import { isValidHistoryId } from '../domain/history'
import { isSafeMediaPath } from '../domain/mediaRegistry'
import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { Disk } from './ports/disk'
import type { HistoryRepository } from './ports/historyRepository'
import type { Shell } from './ports/shell'

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

export interface ExportServiceDeps {
  history: HistoryRepository
  disk: Disk
  dialogs: Dialogs
  shell: Shell
}

/**
 * Menú Exportar (tarea 20): "Guardar como" en los 5 formatos y el `.srt` junto al archivo,
 * que también usa la cola al terminar cada trabajo. Todo en UTF-8 sin BOM: el Bloc de notas
 * de Windows 10/11 detecta UTF-8 sin él, y un BOM confunde a algunos reproductores de .srt.
 */
export class ExportService {
  /** Rutas escritas en esta sesión: las únicas que "Mostrar en el Explorador" acepta. */
  private readonly exported = new Set<string>()

  constructor(private readonly deps: ExportServiceDeps) {}

  /** `export:save`: diálogo "Guardar como" en la carpeta del original y con su nombre. */
  async save(
    owner: DialogOwner,
    entryId: unknown,
    format: unknown,
    segments: unknown,
    options: unknown,
    filterLabel: unknown
  ): Promise<ExportSaved | null> {
    if (!isFormat(format)) throw new Error('Formato de exportación inválido')
    const list = toSegments(segments)
    const entry = await this.entryFor(entryId)
    if (!entry) return null
    const extension = EXPORT_EXTENSIONS[format]
    const path = await this.deps.dialogs.pickSavePath(owner, {
      defaultPath: join(dirname(entry.filePath), `${baseName(entry.fileName)}.${extension}`),
      filterName: typeof filterLabel === 'string' ? filterLabel : extension,
      extension
    })
    if (!path) return null
    const joined = (options as { joined?: unknown } | null)?.joined === true
    await this.deps.disk.writeTextAtomic(path, exportTranscript(format, list, { joined }))
    this.exported.add(path)
    return { path }
  }

  /**
   * Escribe `<archivo>.<idioma>.srt` junto a `filePath`. Sin `overwrite` no pisa uno existente
   * y devuelve `exists`. Lo usan el menú Exportar y la cola ("guardar el .srt al terminar").
   */
  async writeSrtBeside(
    filePath: string,
    language: string,
    segments: readonly Segment[],
    overwrite: boolean
  ): Promise<SaveSrtBesideResult> {
    const { disk } = this.deps
    if (!(await disk.exists(filePath))) return { status: 'missing' }
    const path = join(dirname(filePath), srtFileName(basename(filePath), language))
    if (!overwrite && (await disk.exists(path))) return { status: 'exists', path }
    await disk.writeTextAtomic(path, toSrt(segments))
    this.exported.add(path)
    return { status: 'saved', path }
  }

  /** `export:saveSrtBeside`: la ruta y el idioma salen del historial, no del renderer. */
  async saveSrtBeside(
    entryId: unknown,
    segments: unknown,
    overwrite: unknown
  ): Promise<SaveSrtBesideResult> {
    const list = toSegments(segments)
    if (!isValidHistoryId(entryId)) return { status: 'missing' }
    const saved = await this.deps.history.get(entryId)
    if (!saved || !isSafeMediaPath(saved.entry.filePath)) return { status: 'missing' }
    return this.writeSrtBeside(
      saved.entry.filePath,
      srtLanguage(saved.entry),
      list,
      overwrite === true
    )
  }

  /** `export:showInFolder`: solo archivos que se exportaron en esta sesión. */
  showInFolder(path: unknown): void {
    if (typeof path === 'string' && this.exported.has(path)) this.deps.shell.showItemInFolder(path)
  }

  private async entryFor(id: unknown): Promise<{ filePath: string; fileName: string } | null> {
    if (!isValidHistoryId(id)) return null
    const saved = await this.deps.history.get(id)
    return saved && isSafeMediaPath(saved.entry.filePath) ? saved.entry : null
  }
}
