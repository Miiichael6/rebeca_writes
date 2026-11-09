import { basename } from 'path'
import type { MediaFilterKey } from '@shared/formats'
import type {
  FolderScan,
  HistoryEntry,
  OpenedMedia,
  OpenFilesResult,
  QueueAddResult
} from '@shared/types'
import { isValidHistoryId } from '../domain/history'
import type { MediaOpener } from './mediaOpener'
import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { HistoryRepository } from './ports/historyRepository'
import type { PathExpander } from './ports/pathExpander'
import type { SettingsRepository } from './ports/settingsRepository'
import type { QueueService } from './queueService'

export interface QueueIntakeDeps {
  queue: QueueService
  settings: SettingsRepository
  history: HistoryRepository
  opener: MediaOpener
  expander: PathExpander
  dialogs: Dialogs
}

/** Cómo entran archivos a la cola: diálogo, arrastrar y soltar, "Abrir con" y volver a transcribir. */
export class QueueIntake {
  /** Archivos de la última carpeta revisada, a la espera de que el usuario confirme. */
  private scanned: string[] = []

  constructor(private readonly deps: QueueIntakeDeps) {}

  /** `queue:pickFiles`: diálogo con selección múltiple; todo lo elegido va a la cola. */
  async pickFiles(
    owner: DialogOwner,
    filterLabels: Record<MediaFilterKey, string>
  ): Promise<QueueAddResult> {
    const paths = await this.deps.opener.pickMany(owner, filterLabels)
    return { added: await this.enqueue(paths), ignored: 0 }
  }

  /** `media:openFiles` ("Abrir archivo"): uno se abre en la vista; varios van a la cola. */
  async openFiles(
    owner: DialogOwner,
    filterLabels: Record<MediaFilterKey, string>
  ): Promise<OpenFilesResult | null> {
    const paths = await this.deps.opener.pickMany(owner, filterLabels)
    if (paths.length === 0) return null
    if (paths.length === 1) return { kind: 'opened', media: await this.deps.opener.open(paths[0]) }
    return { kind: 'queued', result: { added: await this.enqueue(paths), ignored: 0 } }
  }

  /**
   * `queue:scanFolder`: el usuario elige una carpeta y se cuentan sus audios y videos (con
   * subcarpetas) sin encolar nada. La lista se queda aquí: `confirmScan` encola lo revisado, no
   * una ruta que mande el renderer.
   */
  async scanFolder(owner: DialogOwner): Promise<FolderScan | null> {
    const folder = await this.deps.dialogs.pickFolder(owner, '')
    if (!folder) return null
    const { files, ignored } = await this.deps.expander.expand([folder])
    this.scanned = files
    return { folder, count: files.length, ignored }
  }

  /** `queue:confirmScan`: con `accept` encola lo revisado; si no, lo descarta. */
  async confirmScan(accept: boolean): Promise<QueueAddResult> {
    const files = this.scanned
    this.scanned = []
    return { added: accept ? await this.enqueue(files) : 0, ignored: 0 }
  }

  /**
   * Drag & drop y "Abrir con": archivos y carpetas (recorridas y filtradas por extensión)
   * van a la cola.
   */
  async addPaths(paths: unknown): Promise<QueueAddResult> {
    const valid = Array.isArray(paths)
      ? paths.filter((p): p is string => typeof p === 'string')
      : []
    const { files, ignored } = await this.deps.expander.expand(valid)
    return { added: await this.enqueue(files), ignored }
  }

  /**
   * `history:retranscribe`: encola el archivo de una entrada con los ajustes actuales. Reutiliza
   * la entrada del historial: al empezar, `TranscriptionManager` vacía sus segmentos.
   */
  async retranscribe(id: unknown): Promise<boolean> {
    const { queue, settings, history } = this.deps
    const saved = isValidHistoryId(id) ? await history.get(id) : null
    if (!saved) return false
    // Ya está en la cola sin terminar: no se encola dos veces.
    const { jobs } = await queue.getState()
    const queued = jobs.some(
      (j) => j.historyId === saved.entry.id && (j.status === 'pending' || j.status === 'processing')
    )
    if (queued) return false
    const { model, language, translate } = settings.get()
    const { filePath, fileName } = saved.entry
    const added = await queue.add([{ filePath, fileName, historyId: saved.entry.id }], {
      model,
      language,
      translate
    })
    return added > 0
  }

  /** `queue:openJob`: abre la vista del trabajo (la ruta sale de la cola, no del renderer). */
  async openJob(id: unknown): Promise<{ entry: HistoryEntry; media: OpenedMedia } | null> {
    const { queue, history, opener } = this.deps
    const job = typeof id === 'string' ? queue.job(id) : undefined
    const saved = job?.historyId ? await history.get(job.historyId) : null
    if (!job || !saved) return null
    return { entry: saved.entry, media: await opener.open(job.filePath) }
  }

  /** Encola archivos con el modelo, idioma y traducción de este momento. */
  private enqueue(paths: string[]): Promise<number> {
    const { model, language, translate } = this.deps.settings.get()
    return this.deps.queue.add(
      paths.map((filePath) => ({ filePath, fileName: basename(filePath) })),
      { model, language, translate }
    )
  }
}
