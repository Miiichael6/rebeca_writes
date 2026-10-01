import { IpcChannel } from '@shared/ipc'
import type {
  Segment,
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob
} from '@shared/types'
import { AUTO_LANGUAGE } from '@shared/whisper'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { HistoryRepository } from './ports/historyRepository'
import type { TranscriptionEnginePort } from './ports/transcription'

/**
 * Puente entre el motor y el resto de la app: agrupa los segmentos que llegan seguidos
 * (spec §2.3 paso 4 / tarea 08 paso 5) para no mandar un mensaje IPC por línea, guarda lo
 * transcrito en el historial y deja esperar el resultado de cada trabajo (la cola).
 */

const SEGMENT_FLUSH_MS = 100

export type TranscriptionResult =
  { ok: true; event: TranscribeDoneEvent } | { ok: false; event: TranscribeErrorEvent }

export interface TranscriptionManagerDeps {
  engine: TranscriptionEnginePort
  history: HistoryRepository
  publisher: EventPublisher
  log: Logger
}

export class TranscriptionManager {
  private readonly pendingSegments = new Map<string, Segment[]>()
  private readonly flushTimers = new Map<string, NodeJS.Timeout>()
  /** Trabajos que guardan en el historial, por id de trabajo. */
  private readonly historyJobs = new Map<string, { historyId: string; language: string }>()
  /** Quien espera el resultado de cada trabajo en marcha (la cola). */
  private readonly waiters = new Map<string, (result: TranscriptionResult) => void>()
  /** Trabajos en marcha, lanzados a mano o por la cola. */
  private readonly running = new Set<string>()
  private idleWaiters: (() => void)[] = []

  constructor(private readonly deps: TranscriptionManagerDeps) {
    const { engine, publisher } = deps
    engine.on('segment', ({ jobId, segments }) => this.onSegments(jobId, segments))
    engine.on('progress', (event) => publisher.publish(IpcChannel.TranscribeProgress, event))
    engine.on('done', (event) => this.onDone(event))
    engine.on('error', (event) => this.onError(event))
  }

  /** Arranca el trabajo sin esperar a que termine; el resultado llega por los eventos IPC. */
  start(job: TranscribeJob): void {
    const { history } = this.deps
    this.running.add(job.id)
    if (job.historyId) {
      const { historyId } = job
      this.historyJobs.set(job.id, { historyId, language: job.language })
      // Volver a transcribir empieza de cero.
      this.persist(
        'marcar el inicio',
        history.setSegments(historyId, []).then(() =>
          history.update(historyId, {
            status: 'transcribing',
            model: job.model,
            language: job.language,
            translate: !!job.translate
          })
        )
      )
    }
    void this.deps.engine.start(job)
  }

  /** Como `start`, pero resuelve con el resultado al terminar, fallar o cancelarse. */
  run(job: TranscribeJob): Promise<TranscriptionResult> {
    return new Promise((resolve) => {
      this.waiters.set(job.id, resolve)
      this.start(job)
    })
  }

  cancel(jobId: string): void {
    this.deps.engine.cancel(jobId)
  }

  /** Al cerrar la app: mata los whisper-cli y ffmpeg en marcha para no dejarlos huérfanos. */
  cancelAll(): void {
    this.deps.engine.cancelAll()
  }

  /** Hay alguna transcripción en marcha (manual o de la cola). */
  isTranscribing(): boolean {
    return this.running.size > 0
  }

  /**
   * Cuenta como transcripción en marcha algo que usa su propio motor (la sesión en vivo, tarea
   * 27): la cola la espera y el actualizador no reinicia. Devuelve con qué soltarla.
   */
  hold(id: string): () => void {
    this.running.add(id)
    return () => this.stopRunning(id)
  }

  /** Resuelve cuando no queda ninguna transcripción en marcha (la cola no pisa a una manual). */
  waitIdle(): Promise<void> {
    if (this.running.size === 0) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  /** Progreso de cada trabajo, para quien lo necesite fuera del renderer (la cola). */
  onProgress(listener: (jobId: string, percent: number) => void): () => void {
    const wrapped = ({ jobId, percent }: { jobId: string; percent: number }): void =>
      listener(jobId, percent)
    this.deps.engine.on('progress', wrapped)
    return () => this.deps.engine.off('progress', wrapped)
  }

  private settle(result: TranscriptionResult): void {
    const { jobId } = result.event
    this.waiters.get(jobId)?.(result)
    this.waiters.delete(jobId)
    this.stopRunning(jobId)
  }

  private stopRunning(jobId: string): void {
    this.running.delete(jobId)
    if (this.running.size === 0) {
      const resolveAll = this.idleWaiters
      this.idleWaiters = []
      resolveAll.forEach((resolve) => resolve())
    }
  }

  /** El guardado en disco nunca debe tumbar la transcripción: los fallos van al log. */
  private persist(what: string, promise: Promise<unknown>): void {
    promise.catch((err) => this.deps.log.error(`Historial: no se pudo ${what}`, err))
  }

  private flushSegments(jobId: string): void {
    const timer = this.flushTimers.get(jobId)
    if (timer) clearTimeout(timer)
    this.flushTimers.delete(jobId)

    const segments = this.pendingSegments.get(jobId)
    this.pendingSegments.delete(jobId)
    if (segments && segments.length > 0) {
      this.deps.publisher.publish(IpcChannel.TranscribeSegment, { jobId, segments })
    }
  }

  private onSegments(jobId: string, segments: Segment[]): void {
    const saved = this.historyJobs.get(jobId)
    if (saved) {
      this.persist('guardar segmentos', this.deps.history.appendSegments(saved.historyId, segments))
    }
    const buffered = this.pendingSegments.get(jobId) ?? []
    buffered.push(...segments)
    this.pendingSegments.set(jobId, buffered)
    if (!this.flushTimers.has(jobId)) {
      this.flushTimers.set(
        jobId,
        setTimeout(() => this.flushSegments(jobId), SEGMENT_FLUSH_MS)
      )
    }
  }

  private onDone(event: TranscribeDoneEvent): void {
    this.flushSegments(event.jobId)
    const saved = this.historyJobs.get(event.jobId)
    this.historyJobs.delete(event.jobId)
    if (saved) {
      const { historyId, language } = saved
      const store = this.deps.history
      this.persist(
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
    this.deps.publisher.publish(IpcChannel.TranscribeDone, event)
    this.settle({ ok: true, event })
  }

  private onError(event: TranscribeErrorEvent): void {
    this.flushSegments(event.jobId)
    const saved = this.historyJobs.get(event.jobId)
    this.historyJobs.delete(event.jobId)
    if (saved) {
      const status = event.code === 'cancelled' ? 'cancelled' : 'error'
      const store = this.deps.history
      this.persist(
        'guardar el error',
        store.update(saved.historyId, { status }).then(() => store.flush())
      )
    }
    this.deps.publisher.publish(IpcChannel.TranscribeError, event)
    this.settle({ ok: false, event })
  }
}
