import { readdir, writeFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { app, BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { srtFileName, hasSiblingSrt, toSrt } from '@shared/exporters'
import type { MediaFilterKey } from '@shared/formats'
import { IpcChannel } from '@shared/ipc'
import { transcribeOptionsFrom } from '@shared/settings'
import type {
  HistoryEntry,
  OpenedMedia,
  OpenFilesResult,
  QueueAddResult,
  QueueJob,
  Segment
} from '@shared/types'
import { AUTO_LANGUAGE } from '@shared/whisper'
import {
  onTranscriptionProgress,
  runTranscription,
  cancelTranscription,
  waitTranscriptionIdle
} from '../engine/transcribeManager'
import { probe } from './ffmpeg'
import { expandPaths } from './fileInput'
import { history } from './history'
import { isValidHistoryId } from './historyStore'
import { openMedia, pickMediaFiles } from './mediaOpen'
import { QueueService, type RunHooks, type RunOutcome } from './queueService'
import { QueueStore } from './queueStore'
import { getSettings } from './settings'

/** Instancia única de la cola, con `userData/queue.json` y el motor real. */

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
}

/** Progreso de los trabajos de la cola en marcha, por id. */
const progressHooks = new Map<string, RunHooks['onProgress']>()
onTranscriptionProgress((jobId, percent) => progressHooks.get(jobId)?.(percent))

/**
 * Entrada del historial del trabajo: la misma si se retoma, o una nueva. Se avisa al
 * renderer en los dos casos para que la muestre en la barra lateral.
 */
async function historyEntryFor(job: QueueJob): Promise<HistoryEntry> {
  const existing = job.historyId ? await history().get(job.historyId) : null
  const entry =
    existing?.entry ??
    (await history().create({
      filePath: job.filePath,
      fileName: job.fileName,
      durationSec: (await probe(job.filePath).catch(() => null))?.durationSec ?? 0,
      model: job.model,
      language: job.language
    }))
  broadcast(IpcChannel.HistoryAdded, entry)
  return entry
}

/**
 * `<archivo>.<idioma>.srt` junto al original (opción "guardar el .srt al terminar"). Pisa
 * el que hubiera con ese nombre: la opción es automática y no puede preguntar.
 */
async function saveSrtBeside(job: QueueJob, segments: Segment[], language: string): Promise<void> {
  const lang = job.translate ? 'en' : language === AUTO_LANGUAGE ? 'und' : language
  const path = join(dirname(job.filePath), srtFileName(job.fileName, lang))
  try {
    await writeFile(path, toSrt(segments), 'utf8')
  } catch (err) {
    log.error(`Cola: no se pudo guardar ${path}`, err)
  }
}

async function run(job: QueueJob, hooks: RunHooks): Promise<RunOutcome> {
  const entry = await historyEntryFor(job)
  hooks.onHistory(entry.id)
  progressHooks.set(job.id, hooks.onProgress)
  try {
    const result = await runTranscription({
      id: job.id,
      filePath: job.filePath,
      model: job.model,
      language: job.language,
      translate: job.translate,
      audioTrack: job.audioTrack,
      historyId: entry.id,
      options: transcribeOptionsFrom(getSettings())
    })
    if (!result.ok) {
      return result.event.code === 'cancelled'
        ? { status: 'cancelled' }
        : { status: 'error', error: result.event.code }
    }
    if (getSettings().queue.autoSaveSrt) {
      await saveSrtBeside(job, result.event.segments, result.event.language)
    }
    return { status: 'done' }
  } finally {
    progressHooks.delete(job.id)
  }
}

async function shouldSkip(job: QueueJob): Promise<boolean> {
  if (!getSettings().queue.skipExistingSrt) return false
  const siblings = await readdir(dirname(job.filePath)).catch(() => [])
  return hasSiblingSrt(job.fileName, siblings)
}

let service: QueueService | null = null

export function queue(): QueueService {
  service ??= new QueueService({
    store: new QueueStore({
      path: join(app.getPath('userData'), 'queue.json'),
      onCorrupt: (backup, err) => log.error(`Cola corrupta; respaldada en ${backup}`, err)
    }),
    run,
    cancel: cancelTranscription,
    waitIdle: waitTranscriptionIdle,
    shouldSkip,
    onChange: (state) => broadcast(IpcChannel.QueueChanged, state),
    onDrained: (event) => broadcast(IpcChannel.QueueDrained, event)
  })
  return service
}

/** Lee `queue.json` al arrancar. */
export function initQueue(): void {
  queue()
    .init()
    .catch((err) => log.error('No se pudo leer la cola', err))
}

/** Encola archivos con el modelo, idioma y traducción de este momento. */
async function enqueueFiles(paths: string[]): Promise<number> {
  const { model, language, translate } = getSettings()
  return queue().add(
    paths.map((filePath) => ({ filePath, fileName: basename(filePath) })),
    { model, language, translate }
  )
}

/** `queue:pickFiles`: diálogo con selección múltiple; todo lo elegido va a la cola. */
export async function pickFilesToQueue(
  window: BrowserWindow | null,
  filterLabels: Record<MediaFilterKey, string>
): Promise<QueueAddResult> {
  const paths = await pickMediaFiles(window, filterLabels)
  return { added: await enqueueFiles(paths), ignored: 0 }
}

/** `media:openFiles` ("Abrir archivo"): uno se abre en la vista; varios van a la cola. */
export async function openFilesDialog(
  window: BrowserWindow | null,
  filterLabels: Record<MediaFilterKey, string>
): Promise<OpenFilesResult | null> {
  const paths = await pickMediaFiles(window, filterLabels)
  if (paths.length === 0) return null
  if (paths.length === 1) return { kind: 'opened', media: await openMedia(paths[0]) }
  return { kind: 'queued', result: { added: await enqueueFiles(paths), ignored: 0 } }
}

/**
 * Drag & drop y "Abrir con": archivos y carpetas (recorridas y filtradas por extensión)
 * van a la cola.
 */
export async function addPathsToQueue(paths: unknown): Promise<QueueAddResult> {
  const valid = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
  const { files, ignored } = await expandPaths(valid)
  return { added: await enqueueFiles(files), ignored }
}

/**
 * `history:retranscribe`: encola el archivo de una entrada con los ajustes actuales. Reutiliza
 * la entrada del historial: al empezar, `transcribeManager` vacía sus segmentos.
 */
export async function retranscribeEntry(id: unknown): Promise<boolean> {
  const saved = isValidHistoryId(id) ? await history().get(id) : null
  if (!saved) return false
  // Ya está en la cola sin terminar: no se encola dos veces.
  const { jobs } = await queue().getState()
  const queued = jobs.some(
    (j) => j.historyId === saved.entry.id && (j.status === 'pending' || j.status === 'processing')
  )
  if (queued) return false
  const { model, language, translate } = getSettings()
  const { filePath, fileName } = saved.entry
  const added = await queue().add([{ filePath, fileName, historyId: saved.entry.id }], {
    model,
    language,
    translate
  })
  return added > 0
}

/** `queue:openJob`: abre la vista del trabajo (la ruta sale de la cola, no del renderer). */
export async function openQueueJob(
  id: unknown
): Promise<{ entry: HistoryEntry; media: OpenedMedia } | null> {
  const job = typeof id === 'string' ? queue().job(id) : undefined
  const saved = job?.historyId ? await history().get(job.historyId) : null
  if (!job || !saved) return null
  return { entry: saved.entry, media: await openMedia(job.filePath) }
}
