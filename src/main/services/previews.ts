import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'
import { IpcChannel, type IpcEventMap } from '@shared/ipc'
import type { MediaInfo, PreviewStatus } from '@shared/types'
import { registerMedia } from './mediaRegistry'
import { PreviewCache, previewPlan } from './previewCache'
import { readSettings } from './settings'

/**
 * Puente entre `PreviewCache` y la app: carpeta `userData/preview-cache`, límite desde
 * settings, lista blanca de `media://` y eventos al renderer.
 */

/** Clave en settings.json (la pantalla de Configuración llega en la tarea 21). */
export const PREVIEW_CACHE_LIMIT_SETTING = 'previewCacheMaxGB'
const DEFAULT_LIMIT_GB = 5

async function limitBytes(): Promise<number> {
  const value = (await readSettings())[PREVIEW_CACHE_LIMIT_SETTING]
  const gb =
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT_GB
  return gb * 1024 ** 3
}

/** Último estado enviado por id de medio: lo necesita `openMedia` si el archivo se reabre. */
const statuses = new Map<string, PreviewStatus>()
let cache: PreviewCache | null = null

function send(payload: IpcEventMap[typeof IpcChannel.MediaPreview]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.MediaPreview, payload)
  }
}

function update(input: string, status: PreviewStatus): void {
  const mediaId = registerMedia(input)
  statuses.set(mediaId, status)
  send({ mediaId, status })
}

function audioIdOf(input: string): string | null {
  const status = statuses.get(registerMedia(input))
  return status && status.state === 'pending' ? status.audioId : null
}

function getCache(): PreviewCache {
  if (cache) return cache
  cache = new PreviewCache({
    dir: join(app.getPath('userData'), 'preview-cache'),
    maxBytes: limitBytes
  })
  cache.on('audio', (input, audioPath) => {
    const status = statuses.get(registerMedia(input))
    const percent = status?.state === 'pending' ? status.percent : 0
    update(input, { state: 'pending', audioId: registerMedia(audioPath), percent })
  })
  cache.on('progress', (input, percent) => {
    update(input, { state: 'pending', audioId: audioIdOf(input), percent })
  })
  cache.on('ready', (input, previewPath) => {
    update(input, { state: 'ready', id: registerMedia(previewPath) })
  })
  cache.on('failed', (input, error) => {
    log.error(`No se pudo generar la vista previa de ${input}`, error)
    update(input, { state: 'failed', audioId: audioIdOf(input) })
  })
  return cache
}

/**
 * Estado de la vista previa de un medio recién abierto. Si hace falta y no existe, empieza
 * a generarla en segundo plano y devuelve `pending` sin esperar.
 */
export async function previewStatusFor(
  filePath: string,
  mediaId: string,
  info: MediaInfo | null
): Promise<PreviewStatus> {
  // Sin probe no se sabe si hace falta: el `<video>` prueba con el original.
  const plan = info ? previewPlan(info) : null
  if (!info || !plan) return { state: 'none' }

  const found = await getCache().lookup(filePath, plan)
  if (found && 'path' in found) {
    const status: PreviewStatus = { state: 'ready', id: registerMedia(found.path) }
    statuses.set(mediaId, status)
    return status
  }
  const known = statuses.get(mediaId)
  if (found && known?.state === 'pending') return known

  const status: PreviewStatus = {
    state: 'pending',
    audioId: plan.audio === 'original' ? mediaId : null,
    percent: 0
  }
  statuses.set(mediaId, status)
  if (!found) {
    getCache()
      .request(filePath, plan, info.durationSec)
      .catch((err) => {
        log.error(`No se pudo pedir la vista previa de ${filePath}`, err)
        update(filePath, { state: 'failed', audioId: status.audioId })
      })
  }
  return status
}

/** Vacía la caché (Borrar historial, Vaciar caché). Nunca toca los archivos originales. */
export async function clearPreviewCache(): Promise<void> {
  await getCache().clear()
  statuses.clear()
  send({ cleared: true })
}

export function previewCacheSize(): Promise<number> {
  return getCache().size()
}

/** Mata ffmpeg al salir; lo que quede a medias se borra en el próximo arranque. */
export function disposePreviews(): void {
  cache?.dispose()
}
