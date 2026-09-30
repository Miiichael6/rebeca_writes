/**
 * Motor propio de la transcripción en vivo (tarea 27): cada ventana del `.pcm` es un trabajo
 * corto del mismo pipeline que un archivo. Va aparte del de `transcribeManager` para que sus
 * eventos (tiempos relativos a la ventana) no lleguen al renderer tal cual.
 */

import type { Backend, ErrorCode, Segment, TranscribeJob } from '@shared/types'
import { TranscriptionEngine } from '../engine/transcriptionEngine'

export type ChunkResult =
  { ok: true; language: string; backend: Backend } | { ok: false; code: ErrorCode }

const engine = new TranscriptionEngine()

/** Transcribe una ventana; `onSegments` recibe cada línea en cuanto whisper la escribe. */
export function transcribeChunk(
  job: TranscribeJob,
  onSegments: (segments: Segment[]) => void
): Promise<ChunkResult> {
  return new Promise((resolve) => {
    const ours = (event: { jobId: string }): boolean => event.jobId === job.id
    const onSegment = (event: { jobId: string; segments: Segment[] }): void => {
      if (ours(event)) onSegments(event.segments)
    }
    const onDone = (event: { jobId: string; language: string; backend: Backend }): void => {
      if (!ours(event)) return
      cleanup()
      resolve({ ok: true, language: event.language, backend: event.backend })
    }
    const onError = (event: { jobId: string; code: ErrorCode }): void => {
      if (!ours(event)) return
      cleanup()
      resolve({ ok: false, code: event.code })
    }
    const cleanup = (): void => {
      engine.off('segment', onSegment)
      engine.off('done', onDone)
      engine.off('error', onError)
    }
    engine.on('segment', onSegment)
    engine.on('done', onDone)
    engine.on('error', onError)
    void engine.start(job)
  })
}

export function cancelChunk(jobId: string): void {
  engine.cancel(jobId)
}

/** Al cerrar la app: que no quede ningún whisper-cli de una ventana en marcha. */
export function cancelAllChunks(): void {
  engine.cancelAll()
}
