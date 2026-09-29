import { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type {
  Segment,
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob
} from '@shared/types'
import { AUTO_LANGUAGE } from '@shared/whisper'
import { history } from '../services/history'
import { TranscriptionEngine } from './transcriptionEngine'

/**
 * Instancia única del motor y su puente con el renderer: agrupa los segmentos que llegan
 * seguidos (spec §2.3 paso 4 / tarea 08 paso 5) para no mandar un mensaje IPC por línea.
 */

const SEGMENT_FLUSH_MS = 100

const engine = new TranscriptionEngine()
const pendingSegments = new Map<string, Segment[]>()
const flushTimers = new Map<string, NodeJS.Timeout>()
/** Trabajos que guardan en el historial, por id de trabajo. */
const historyJobs = new Map<string, { historyId: string; language: string }>()

export type TranscriptionResult =
  { ok: true; event: TranscribeDoneEvent } | { ok: false; event: TranscribeErrorEvent }

/** Quien espera el resultado de cada trabajo en marcha (la cola). */
const waiters = new Map<string, (result: TranscriptionResult) => void>()
/** Trabajos en marcha, lanzados a mano o por la cola. */
const running = new Set<string>()
let idleWaiters: (() => void)[] = []

function settle(result: TranscriptionResult): void {
  const { jobId } = result.event
  waiters.get(jobId)?.(result)
  waiters.delete(jobId)
  running.delete(jobId)
  if (running.size === 0) {
    const resolveAll = idleWaiters
    idleWaiters = []
    resolveAll.forEach((resolve) => resolve())
  }
}

/** El guardado en disco nunca debe tumbar la transcripción: los fallos van al log. */
function persist(what: string, promise: Promise<unknown>): void {
  promise.catch((err) => log.error(`Historial: no se pudo ${what}`, err))
}

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
}

function flushSegments(jobId: string): void {
  const timer = flushTimers.get(jobId)
  if (timer) clearTimeout(timer)
  flushTimers.delete(jobId)

  const segments = pendingSegments.get(jobId)
  pendingSegments.delete(jobId)
  if (segments && segments.length > 0) {
    broadcast(IpcChannel.TranscribeSegment, { jobId, segments })
  }
}

engine.on('segment', ({ jobId, segments }) => {
  const saved = historyJobs.get(jobId)
  if (saved) persist('guardar segmentos', history().appendSegments(saved.historyId, segments))
  const buffered = pendingSegments.get(jobId) ?? []
  buffered.push(...segments)
  pendingSegments.set(jobId, buffered)
  if (!flushTimers.has(jobId)) {
    flushTimers.set(
      jobId,
      setTimeout(() => flushSegments(jobId), SEGMENT_FLUSH_MS)
    )
  }
})

engine.on('progress', (event) => broadcast(IpcChannel.TranscribeProgress, event))

engine.on('done', (event) => {
  flushSegments(event.jobId)
  const saved = historyJobs.get(event.jobId)
  historyJobs.delete(event.jobId)
  if (saved) {
    const { historyId, language } = saved
    const store = history()
    persist(
      'guardar el resultado',
      store
        .setSegments(historyId, event.segments)
        .then(() =>
          store.update(historyId, {
            status: 'done',
            backend: event.backend,
            ...(language === AUTO_LANGUAGE ? { detectedLanguage: event.language } : {})
          })
        )
        .then(() => store.flush())
    )
  }
  broadcast(IpcChannel.TranscribeDone, event)
  settle({ ok: true, event })
})

engine.on('error', (event) => {
  flushSegments(event.jobId)
  const saved = historyJobs.get(event.jobId)
  historyJobs.delete(event.jobId)
  if (saved) {
    const status = event.code === 'cancelled' ? 'cancelled' : 'error'
    const store = history()
    persist(
      'guardar el error',
      store.update(saved.historyId, { status }).then(() => store.flush())
    )
  }
  broadcast(IpcChannel.TranscribeError, event)
  settle({ ok: false, event })
})

/** Arranca el trabajo sin esperar a que termine; el resultado llega por los eventos IPC. */
export function startTranscription(job: TranscribeJob): void {
  running.add(job.id)
  if (job.historyId) {
    const { historyId } = job
    historyJobs.set(job.id, { historyId, language: job.language })
    // Volver a transcribir empieza de cero.
    persist(
      'marcar el inicio',
      history()
        .setSegments(historyId, [])
        .then(() =>
          history().update(historyId, {
            status: 'transcribing',
            model: job.model,
            language: job.language,
            translate: !!job.translate
          })
        )
    )
  }
  void engine.start(job)
}

/** Como `startTranscription`, pero resuelve con el resultado al terminar, fallar o cancelarse. */
export function runTranscription(job: TranscribeJob): Promise<TranscriptionResult> {
  return new Promise((resolve) => {
    waiters.set(job.id, resolve)
    startTranscription(job)
  })
}

export function cancelTranscription(jobId: string): void {
  engine.cancel(jobId)
}

/** Al cerrar la app: mata los whisper-cli y ffmpeg en marcha para no dejarlos huérfanos. */
export function cancelAllTranscriptions(): void {
  engine.cancelAll()
}

/** Hay alguna transcripción en marcha (manual o de la cola). */
export function isTranscribing(): boolean {
  return running.size > 0
}

/** Resuelve cuando no queda ninguna transcripción en marcha (la cola no pisa a una manual). */
export function waitTranscriptionIdle(): Promise<void> {
  if (running.size === 0) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

/** Progreso de cada trabajo, para quien lo necesite fuera del renderer (la cola). */
export function onTranscriptionProgress(
  listener: (jobId: string, percent: number) => void
): () => void {
  const wrapped = ({ jobId, percent }: { jobId: string; percent: number }): void =>
    listener(jobId, percent)
  engine.on('progress', wrapped)
  return () => engine.off('progress', wrapped)
}
