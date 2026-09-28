import { randomUUID } from 'crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { app, BrowserWindow, dialog, net } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import {
  catalogModel,
  CUSTOM_MODEL_PREFIX,
  MODEL_CATALOG,
  type ModelActionResult,
  type ModelDownloadResult,
  type ModelStatus
} from '@shared/models'
import {
  DownloadError,
  downloadWithResume,
  fileSize,
  freeDiskSpace,
  hasGgmlHeader,
  partPath
} from './modelDownload'

/** Margen libre que se deja en el disco además del modelo. */
const DISK_MARGIN_BYTES = 100 * 1024 * 1024

interface CustomModel {
  id: string
  name: string
  /** Ruta del `.bin` elegido por el usuario; no se copia (spec §2.2). */
  path: string
  addedAt: number
}

const downloads = new Map<
  string,
  { controller: AbortController; promise: Promise<ModelDownloadResult> }
>()
/** Cuántas transcripciones activas usan cada modelo; lo gestiona el motor (tarea 08). */
const inUse = new Map<string, number>()

export function modelsDir(): string {
  return join(app.getPath('userData'), 'models')
}

function customListPath(): string {
  return join(modelsDir(), 'custom.json')
}

async function readCustomModels(): Promise<CustomModel[]> {
  try {
    const data: unknown = JSON.parse(await readFile(customListPath(), 'utf8'))
    return Array.isArray(data) ? (data as CustomModel[]) : []
  } catch {
    return []
  }
}

async function writeCustomModels(models: CustomModel[]): Promise<void> {
  await mkdir(modelsDir(), { recursive: true })
  const path = customListPath()
  const tmp = `${path}.tmp`
  await writeFile(tmp, JSON.stringify(models, null, 2), 'utf8')
  await rename(tmp, path)
}

function notifyChanged(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.ModelsChanged)
  }
}

export async function listModels(): Promise<ModelStatus[]> {
  const dir = modelsDir()
  const catalog = await Promise.all(
    MODEL_CATALOG.map(async (m): Promise<ModelStatus> => {
      const path = join(dir, m.file)
      const size = await fileSize(path)
      const downloaded = size === m.sizeBytes && !downloads.has(m.id)
      return {
        id: m.id,
        label: m.label,
        custom: false,
        state: downloaded ? 'downloaded' : downloads.has(m.id) ? 'downloading' : 'missing',
        sizeOnDisk: downloaded ? size : await fileSize(partPath(path)),
        sizeBytes: m.sizeBytes,
        path: downloaded ? path : undefined,
        speed: m.speed,
        accuracy: m.accuracy,
        memoryGb: m.memoryGb
      }
    })
  )
  const custom = await Promise.all(
    (await readCustomModels()).map(async (m): Promise<ModelStatus> => {
      const size = await fileSize(m.path)
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

/** Ruta del modelo listo para usar, o `null` si no está descargado. Para el motor (tarea 08). */
export async function resolveModelPath(id: string): Promise<string | null> {
  const model = (await listModels()).find((m) => m.id === id)
  return model?.state === 'downloaded' && model.path ? model.path : null
}

/** Marca el modelo como en uso mientras dure una transcripción; devuelve la función para soltarlo. */
export function acquireModel(id: string): () => void {
  inUse.set(id, (inUse.get(id) ?? 0) + 1)
  let released = false
  return () => {
    if (released) return
    released = true
    const count = (inUse.get(id) ?? 1) - 1
    if (count > 0) inUse.set(id, count)
    else inUse.delete(id)
  }
}

export function downloadModel(id: string): Promise<ModelDownloadResult> {
  const existing = downloads.get(id)
  if (existing) return existing.promise

  const controller = new AbortController()
  const promise = runDownload(id, controller.signal).finally(() => {
    downloads.delete(id)
    notifyChanged()
  })
  downloads.set(id, { controller, promise })
  notifyChanged()
  return promise
}

async function runDownload(id: string, signal: AbortSignal): Promise<ModelDownloadResult> {
  const model = catalogModel(id)
  if (!model) return { status: 'error', code: 'modelNotFound' }

  const dir = modelsDir()
  const dest = join(dir, model.file)
  if ((await fileSize(dest)) === model.sizeBytes) return { status: 'done' }

  try {
    await mkdir(dir, { recursive: true })
    const remaining = model.sizeBytes - (await fileSize(partPath(dest)))
    if ((await freeDiskSpace(dir)) < remaining + DISK_MARGIN_BYTES) {
      return { status: 'error', code: 'noDiskSpace' }
    }

    log.info(`Descargando modelo ${id} → ${dest}`)
    await downloadWithResume({
      url: model.url,
      dest,
      expectedSize: model.sizeBytes,
      signal,
      // net.fetch usa la red de Chromium: respeta el proxy del sistema.
      fetch: (url, init) => net.fetch(url, init),
      onProgress: (p) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send(IpcChannel.ModelsProgress, { id, ...p })
        }
      }
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
    if ((err as NodeJS.ErrnoException).code === 'ENOSPC')
      return { status: 'error', code: 'noDiskSpace' }
    return { status: 'error', code: 'downloadFailed' }
  }
}

/** Cancela la descarga; el `.part` se conserva para reanudar. */
export function cancelDownload(id: string): void {
  downloads.get(id)?.controller.abort()
}

/**
 * Borra un modelo del catálogo (el `.bin` y el `.part`) o quita un personalizado de la lista
 * (sin tocar el archivo del usuario). No se puede mientras lo use una transcripción.
 */
export async function deleteModel(id: string): Promise<ModelActionResult> {
  if (inUse.has(id)) return { ok: false, code: 'modelInUse' }

  const download = downloads.get(id)
  if (download) {
    download.controller.abort()
    await download.promise
  }

  if (id.startsWith(CUSTOM_MODEL_PREFIX)) {
    const models = await readCustomModels()
    await writeCustomModels(models.filter((m) => m.id !== id))
  } else {
    const model = catalogModel(id)
    if (!model) return { ok: false, code: 'modelNotFound' }
    const dest = join(modelsDir(), model.file)
    await Promise.all([unlink(dest).catch(() => {}), unlink(partPath(dest)).catch(() => {})])
  }
  log.info(`Modelo ${id} eliminado`)
  notifyChanged()
  return { ok: true }
}

/** Diálogo para elegir un `.bin` local. Devuelve la ruta o `null` si se cancela. */
export async function pickCustomModelFile(window: BrowserWindow | null): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'GGML', extensions: ['bin'] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

/** Añade un modelo personalizado tras validar extensión y cabecera GGML. */
export async function addCustomModel(path: string, name: string): Promise<ModelActionResult> {
  const label = name.trim() || basename(path, extname(path))
  const isFile = await stat(path).then(
    (s) => s.isFile(),
    () => false
  )
  if (!isFile || extname(path).toLowerCase() !== '.bin' || !(await hasGgmlHeader(path))) {
    return { ok: false, code: 'invalidModel' }
  }

  const models = await readCustomModels()
  const existing = models.find((m) => m.path.toLowerCase() === path.toLowerCase())
  if (existing) existing.name = label
  else
    models.push({ id: CUSTOM_MODEL_PREFIX + randomUUID(), name: label, path, addedAt: Date.now() })
  await writeCustomModels(models)
  log.info(`Modelo personalizado añadido: ${label} (${path})`)
  notifyChanged()
  return { ok: true }
}
