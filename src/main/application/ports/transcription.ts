import type {
  Backend,
  ErrorCode,
  Segment,
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob,
  TranscribeProgressEvent,
  TranscribeSegmentEvent
} from '@shared/types'

export interface TranscriptionEngineEvents {
  segment: TranscribeSegmentEvent
  progress: TranscribeProgressEvent
  done: TranscribeDoneEvent
  error: TranscribeErrorEvent
}

/** Puerto de salida: el motor que ejecuta el pipeline probe → WAV → whisper-cli. */
export interface TranscriptionEnginePort {
  on<K extends keyof TranscriptionEngineEvents>(
    event: K,
    listener: (e: TranscriptionEngineEvents[K]) => void
  ): unknown
  off<K extends keyof TranscriptionEngineEvents>(
    event: K,
    listener: (e: TranscriptionEngineEvents[K]) => void
  ): unknown
  /** No rechaza: los fallos llegan por el evento `error`. */
  start(job: TranscribeJob): Promise<void>
  cancel(jobId: string): void
  cancelAll(): void
}

export type ChunkResult =
  { ok: true; language: string; backend: Backend } | { ok: false; code: ErrorCode }

/** Puerto de salida: transcribe ventanas cortas de la sesión en vivo con un motor aparte. */
export interface ChunkTranscriber {
  /** `onSegments` recibe cada línea en cuanto whisper la escribe. */
  transcribe(job: TranscribeJob, onSegments: (segments: Segment[]) => void): Promise<ChunkResult>
  cancel(jobId: string): void
  /** Al cerrar la app: que no quede ningún whisper-cli de una ventana en marcha. */
  cancelAll(): void
}
