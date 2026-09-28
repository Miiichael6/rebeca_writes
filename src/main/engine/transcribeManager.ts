import { BrowserWindow } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { Segment, TranscribeJob } from '@shared/types'
import { TranscriptionEngine } from './transcriptionEngine'

/**
 * Instancia única del motor y su puente con el renderer: agrupa los segmentos que llegan
 * seguidos (spec §2.3 paso 4 / tarea 08 paso 5) para no mandar un mensaje IPC por línea.
 */

const SEGMENT_FLUSH_MS = 100

const engine = new TranscriptionEngine()
const pendingSegments = new Map<string, Segment[]>()
const flushTimers = new Map<string, NodeJS.Timeout>()

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
  broadcast(IpcChannel.TranscribeDone, event)
})

engine.on('error', (event) => {
  flushSegments(event.jobId)
  broadcast(IpcChannel.TranscribeError, event)
})

/** Arranca el trabajo sin esperar a que termine; el resultado llega por los eventos IPC. */
export function startTranscription(job: TranscribeJob): void {
  void engine.start(job)
}

export function cancelTranscription(jobId: string): void {
  engine.cancel(jobId)
}
