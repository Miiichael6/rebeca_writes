import { randomUUID } from 'crypto'
import { basename, extname, join } from 'path'
import { IpcChannel } from '@shared/ipc'
import {
  catalogModel,
  CUSTOM_MODEL_PREFIX,
  MODEL_CATALOG,
  type ModelActionResult,
  type ModelDownloadResult,
  type ModelStatus
} from '@shared/models'
import { DownloadError, partPath } from '../domain/downloads'
import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { Disk } from './ports/disk'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { FileDownloader } from './ports/fileDownloader'
import type { ModelStore } from './ports/modelStore'

/** Margen libre que se deja en el disco además del modelo. */
const DISK_MARGIN_BYTES = 100 * 1024 * 1024

export interface ModelServiceDeps {
  store: ModelStore
  disk: Disk
  downloader: FileDownloader
  dialogs: Dialogs
  publisher: EventPublisher
  log: Logger
}

/** Catálogo de modelos de whisper: estado en disco, descarga con reanudación y modelos propios. */
export class ModelService {
  private readonly downloads = new Map<
    string,
    { controller: AbortController; promise: Promise<ModelDownloadResult> }
  >()
  /** Cuántas transcripciones activas usan cada modelo. */
  private readonly inUse = new Map<string, number>()

  constructor(private readonly deps: ModelServiceDeps) {}

  get dir(): string {
    return this.deps.store.dir
  }

  async list(): Promise<ModelStatus[]> {
    const { store, disk } = this.deps
    const catalog = await Promise.all(
      MODEL_CATALOG.map(async (m): Promise<ModelStatus> => {
        const path = join(store.dir, m.file)
        const size = await disk.fileSize(path)
        const downloading = this.downloads.has(m.id)
        const downloaded = size === m.sizeBytes && !downloading
        return {
          id: m.id,
          label: m.label,
          custom: false,
          state: downloaded ? 'downloaded' : downloading ? 'downloading' : 'missing',
          sizeOnDisk: downloaded ? size : await disk.fileSize(partPath(path)),
          sizeBytes: m.sizeBytes,
          path: downloaded ? path : undefined,
          speed: m.speed,
          accuracy: m.accuracy,
          memoryGb: m.memoryGb
        }
      })
    )
    const custom = await Promise.all(
      (await store.readCustom()).map(async (m): Promise<ModelStatus> => {
        const size = await disk.fileSize(m.path)
        return {
          id: m.id,
          label: m.name,
          custom: true,
          // Si el usuario movió o borró el archivo, queda como no disponible.
          state: size > 0 ? 'downloaded' : 'missing',
          sizeOnDisk: size,
          path: m.path
        }
      })
    )
    return [...catalog, ...custom]
  }

  /** Ruta del modelo listo para usar, o `null` si no está descargado. */
  async resolvePath(id: string): Promise<string | null> {
    const model = (await this.list()).find((m) => m.id === id)
    return model?.state === 'downloaded' && model.path ? model.path : null
  }

  /** Marca el modelo como en uso mientras dure una transcripción; devuelve la función para soltarlo. */
  acquire(id: string): () => void {
    this.inUse.set(id, (this.inUse.get(id) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      const count = (this.inUse.get(id) ?? 1) - 1
      if (count > 0) this.inUse.set(id, count)
      else this.inUse.delete(id)
    }
  }

  download(id: string): Promise<ModelDownloadResult> {
    const existing = this.downloads.get(id)
    if (existing) return existing.promise

    const controller = new AbortController()
    const promise = this.runDownload(id, controller.signal).finally(() => {
      this.downloads.delete(id)
      this.notifyChanged()
    })
    this.downloads.set(id, { controller, promise })
    this.notifyChanged()
    return promise
  }

  /** Cancela la descarga; el `.part` se conserva para reanudar. */
  cancelDownload(id: string): void {
    this.downloads.get(id)?.controller.abort()
  }

  /**
   * Borra un modelo del catálogo (el `.bin` y el `.part`) o quita un personalizado de la lista
   * (sin tocar el archivo del usuario). No se puede mientras lo use una transcripción.
   */
  async delete(id: string): Promise<ModelActionResult> {
    const { store, disk, log } = this.deps
    if (this.inUse.has(id)) return { ok: false, code: 'modelInUse' }

    const download = this.downloads.get(id)
    if (download) {
      download.controller.abort()
      await download.promise
    }

    if (id.startsWith(CUSTOM_MODEL_PREFIX)) {
      const models = await store.readCustom()
      await store.writeCustom(models.filter((m) => m.id !== id))
    } else {
      const model = catalogModel(id)
      if (!model) return { ok: false, code: 'modelNotFound' }
      const dest = join(store.dir, model.file)
      await Promise.all([disk.remove(dest), disk.remove(partPath(dest))])
    }
    log.info(`Modelo ${id} eliminado`)
    this.notifyChanged()
    return { ok: true }
  }

  /** Diálogo para elegir un `.bin` local. Devuelve la ruta o `null` si se cancela. */
  pickCustomFile(owner: DialogOwner): Promise<string | null> {
    return this.deps.dialogs.pickModelFile(owner)
  }

  /** Añade un modelo personalizado tras validar extensión y cabecera GGML. */
  async addCustom(path: string, name: string): Promise<ModelActionResult> {
    const { store, log } = this.deps
    const label = name.trim() || basename(path, extname(path))
    if (extname(path).toLowerCase() !== '.bin' || !(await store.isGgmlFile(path))) {
      return { ok: false, code: 'invalidModel' }
    }

    const models = await store.readCustom()
    const existing = models.find((m) => m.path.toLowerCase() === path.toLowerCase())
    if (existing) existing.name = label
    else
      models.push({
        id: CUSTOM_MODEL_PREFIX + randomUUID(),
        name: label,
        path,
        addedAt: Date.now()
      })
    await store.writeCustom(models)
    log.info(`Modelo personalizado añadido: ${label} (${path})`)
    this.notifyChanged()
    return { ok: true }
  }

  private async runDownload(id: string, signal: AbortSignal): Promise<ModelDownloadResult> {
    const { store, disk, downloader, publisher, log } = this.deps
    const model = catalogModel(id)
    if (!model) return { status: 'error', code: 'modelNotFound' }

    const dest = join(store.dir, model.file)
    if ((await disk.fileSize(dest)) === model.sizeBytes) return { status: 'done' }

    try {
      await disk.ensureDir(store.dir)
      const remaining = model.sizeBytes - (await disk.fileSize(partPath(dest)))
      if ((await disk.freeSpace(store.dir)) < remaining + DISK_MARGIN_BYTES) {
        return { status: 'error', code: 'noDiskSpace' }
      }

      log.info(`Descargando modelo ${id} → ${dest}`)
      await downloader.download({
        url: model.url,
        dest,
        expectedSize: model.sizeBytes,
        signal,
        onProgress: (p) => publisher.publish(IpcChannel.ModelsProgress, { id, ...p })
      })
      log.info(`Modelo ${id} descargado`)
      return { status: 'done' }
    } catch (err) {
      if (signal.aborted) {
        log.info(`Descarga del modelo ${id} cancelada`)
        return { status: 'cancelled' }
      }
      log.error(`Falló la descarga del modelo ${id}`, err)
      if (err instanceof DownloadError) return { status: 'error', code: err.code }
      if ((err as NodeJS.ErrnoException).code === 'ENOSPC') {
        return { status: 'error', code: 'noDiskSpace' }
      }
      return { status: 'error', code: 'downloadFailed' }
    }
  }

  private notifyChanged(): void {
    this.deps.publisher.publish(IpcChannel.ModelsChanged, undefined)
  }
}
