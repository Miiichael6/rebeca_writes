import { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type { Segment, TranscribeJob } from '@shared/types'
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
})

/** Arranca el trabajo sin esperar a que termine; el resultado llega por los eventos IPC. */
export function startTranscription(job: TranscribeJob): void {
  if (job.historyId) {
    const { historyId } = job
    historyJobs.set(job.id, { historyId, language: job.language })
    // Volver a transcribir empieza de cero.
    persist(
      'marcar el inicio',
      history()
        .setSegments(historyId, [])
        .then(() => history().update(historyId, { status: 'transcribing' }))
    )
  }
  void engine.start(job)
}

export function cancelTranscription(jobId: string): void {
  engine.cancel(jobId)
}
