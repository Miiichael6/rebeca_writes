import type { ErrorCode, QueueDrainedEvent, QueueJob, QueueState } from '@shared/types'

export type RunOutcome =
  { status: 'done' } | { status: 'error'; error: ErrorCode } | { status: 'cancelled' }

export interface RunHooks {
  /** Entrada del historial del trabajo, en cuanto existe. */
  onHistory: (historyId: string) => void
  /** 0–100. */
  onProgress: (percent: number) => void
}

/** Puerto de salida: quien realmente transcribe los trabajos de la cola. */
export interface QueueRunner {
  /** Transcribe el trabajo y resuelve al terminar. No debería rechazar. */
  run(job: QueueJob, hooks: RunHooks): Promise<RunOutcome>
  cancel(jobId: string): void
  /** Resuelve cuando no queda otra transcripción en marcha (p. ej. una lanzada a mano). */
  waitIdle(): Promise<void>
  /** ¿Se salta el trabajo sin transcribirlo? (opción "ya tiene .srt al lado"). */
  shouldSkip(job: QueueJob): Promise<boolean>
}

/** Puerto de salida: avisos de la cola a quien la muestra. */
export interface QueueNotifier {
  onChange(state: QueueState): void
  onDrained(event: QueueDrainedEvent): void
}
