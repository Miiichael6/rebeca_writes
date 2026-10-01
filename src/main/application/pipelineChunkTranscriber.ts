import type { Backend, ErrorCode, Segment, TranscribeJob } from '@shared/types'
import type { ChunkResult, ChunkTranscriber, TranscriptionEnginePort } from './ports/transcription'

/**
 * Transcripción en vivo (tarea 27): cada ventana del `.pcm` es un trabajo corto del mismo
 * pipeline que un archivo. Usa un motor propio, aparte del de `TranscriptionManager`, para que
 * sus eventos (tiempos relativos a la ventana) no lleguen al renderer tal cual.
 */
export class PipelineChunkTranscriber implements ChunkTranscriber {
  constructor(private readonly engine: TranscriptionEnginePort) {}

  /** Transcribe una ventana; `onSegments` recibe cada línea en cuanto whisper la escribe. */
  transcribe(job: TranscribeJob, onSegments: (segments: Segment[]) => void): Promise<ChunkResult> {
    const { engine } = this
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

  cancel(jobId: string): void {
    this.engine.cancel(jobId)
  }

  cancelAll(): void {
    this.engine.cancelAll()
  }
}
