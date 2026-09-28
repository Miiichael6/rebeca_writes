import { randomUUID } from 'crypto'
import type { ErrorCode, QueueDrainedEvent, QueueJob, QueueState } from '@shared/types'

/**
 * Lógica de la cola (spec §4.2), sin Electron: procesa los trabajos de uno en uno, en el
 * orden de la lista, y un error no la detiene. Transcribir, persistir y avisar al renderer
 * llegan como dependencias (la instancia real está en `queue.ts`).
 */

export type RunOutcome =
  { status: 'done' } | { status: 'error'; error: ErrorCode } | { status: 'cancelled' }

export interface RunHooks {
  /** Entrada del historial del trabajo, en cuanto existe. */
  onHistory: (historyId: string) => void
  /** 0–100. */
  onProgress: (percent: number) => void
}

/** Lo que se congela al encolar (tarea 17 paso 1). */
export type FrozenOptions = Pick<QueueJob, 'model' | 'language' | 'translate' | 'audioTrack'>

export interface NewQueueFile {
  filePath: string
  fileName: string
  /** Reutiliza esta entrada del historial en vez de crear otra ("Volver a transcribir"). */
  historyId?: string
}

export interface QueueDeps {
  store: {
    load: () => Promise<QueueJob[]>
    save: (jobs: () => QueueJob[]) => void
  }
  /** Transcribe el trabajo y resuelve al terminar. No debería rechazar. */
  run: (job: QueueJob, hooks: RunHooks) => Promise<RunOutcome>
  cancel: (jobId: string) => void
  /** Resuelve cuando no queda otra transcripción en marcha (p. ej. una lanzada a mano). */
  waitIdle: () => Promise<void>
  /** ¿Se salta el trabajo sin transcribirlo? (opción "ya tiene .srt al lado"). */
  shouldSkip: (job: QueueJob) => Promise<boolean>
  onChange: (state: QueueState) => void
  onDrained: (event: QueueDrainedEvent) => void
  now?: () => number
}

const FINISHED: ReadonlySet<QueueJob['status']> = new Set(['done', 'error', 'cancelled'])

export class QueueService {
  private jobs: QueueJob[] = []
  private paused = false
  private resumePending = false
  private pumping = false
  /** La app se está cerrando: no se toman trabajos ni se guarda nada más. */
  private closing = false
  /** Id del trabajo en proceso y si se pidió cancelarlo antes de que llegara a whisper. */
  private current: { id: string; cancelled: boolean } | null = null
  /** Resultados desde el último aviso de cola vacía. */
  private tally = { done: 0, errors: 0 }
  private readonly ready: Promise<void>
  private resolveReady!: () => void

  constructor(private readonly deps: QueueDeps) {
    this.ready = new Promise((resolve) => (this.resolveReady = resolve))
  }

  /**
   * Lee `queue.json`. Si quedaron trabajos sin terminar (el que estaba en proceso ya vuelve
   * como `pending`), la cola espera a que el usuario elija Retomar o Descartar.
   */
  async init(): Promise<void> {
    try {
      this.jobs = await this.deps.store.load()
      this.resumePending = this.jobs.some((j) => j.status === 'pending')
    } finally {
      this.resolveReady()
    }
    this.changed(false)
  }

  state(): QueueState {
    return {
      jobs: this.jobs.map((j) => ({ ...j })),
      paused: this.paused,
      resumePending: this.resumePending
    }
  }

  async getState(): Promise<QueueState> {
    await this.ready
    return this.state()
  }

  job(id: string): QueueJob | undefined {
    const job = this.jobs.find((j) => j.id === id)
    return job && { ...job }
  }

  async add(files: NewQueueFile[], frozen: FrozenOptions): Promise<number> {
    await this.ready
    const now = this.deps.now?.() ?? Date.now()
    for (const file of files) {
      this.jobs.push({
        id: randomUUID(),
        filePath: file.filePath,
        fileName: file.fileName,
        ...(file.historyId ? { historyId: file.historyId } : {}),
        ...frozen,
        status: 'pending',
        addedAt: now
      })
    }
    if (files.length > 0) {
      this.changed()
      void this.pump()
    }
    return files.length
  }

  /** Quita un trabajo que no se está procesando (para ese está `cancelCurrent`). */
  remove(id: string): void {
    const index = this.jobs.findIndex((j) => j.id === id)
    if (index < 0 || this.jobs[index].status === 'processing') return
    this.jobs.splice(index, 1)
    this.changed()
  }

  /**
   * Nuevo orden de la lista. Los ids desconocidos se ignoran y los que falten quedan al
   * final en su orden de antes, así un orden viejo del renderer no pierde trabajos.
   */
  reorder(ids: string[]): void {
    const byId = new Map(this.jobs.map((j) => [j.id, j]))
    const next: QueueJob[] = []
    for (const id of ids) {
      const job = byId.get(id)
      if (job) {
        next.push(job)
        byId.delete(id)
      }
    }
    next.push(...byId.values())
    this.jobs = next
    this.changed()
  }

  /** Deja de tomar trabajos nuevos; el que está en proceso termina. */
  pause(): void {
    if (this.paused) return
    this.paused = true
    this.changed(false)
  }

  /** Reanuda tras pausar, y es el "Retomar" del arranque. */
  resume(): void {
    this.paused = false
    this.resumePending = false
    this.changed(false)
    void this.pump()
  }

  /** "Descartar" del arranque: quita los pendientes de la sesión anterior. */
  discard(): void {
    if (!this.resumePending) return
    this.resumePending = false
    this.jobs = this.jobs.filter((j) => j.status !== 'pending')
    this.changed()
  }

  cancelCurrent(): void {
    if (!this.current) return
    this.current.cancelled = true
    this.deps.cancel(this.current.id)
  }

  /** Quita los terminados (completados, con error y cancelados). */
  clearCompleted(): void {
    const before = this.jobs.length
    this.jobs = this.jobs.filter((j) => !FINISHED.has(j.status))
    if (this.jobs.length !== before) this.changed()
  }

  /**
   * Al cerrar la app: lo que pase después (el trabajo en proceso muere con ella) no se
   * guarda, así en `queue.json` sigue `processing` y al volver se retoma como `pending`.
   */
  shutdown(): void {
    this.closing = true
  }

  /** Espera a que no haya bucle en marcha (para los tests). */
  async idle(): Promise<void> {
    while (this.pumping) await new Promise((resolve) => setTimeout(resolve, 0))
  }

  private canRun(): boolean {
    return !this.paused && !this.resumePending && !this.closing
  }

  private async pump(): Promise<void> {
    await this.ready
    if (this.pumping) return
    this.pumping = true
    let drained = false
    try {
      while (this.canRun()) {
        await this.deps.waitIdle()
        const job = this.canRun() ? this.jobs.find((j) => j.status === 'pending') : undefined
        if (!job) {
          drained = this.canRun()
          break
        }
        await this.process(job)
      }
    } finally {
      this.pumping = false
    }
    if (drained && this.tally.done + this.tally.errors > 0) {
      const event = { ...this.tally }
      this.tally = { done: 0, errors: 0 }
      this.deps.onDrained(event)
    }
  }

  private async process(job: QueueJob): Promise<void> {
    const current = { id: job.id, cancelled: false }
    this.current = current
    job.status = 'processing'
    job.progress = 0
    delete job.error
    delete job.skipped
    this.changed()

    let outcome: RunOutcome | 'skipped'
    try {
      if (await this.deps.shouldSkip(job)) outcome = 'skipped'
      else if (current.cancelled) outcome = { status: 'cancelled' }
      else {
        outcome = await this.deps.run(job, {
          onHistory: (historyId) => {
            job.historyId = historyId
            this.changed()
          },
          onProgress: (percent) => {
            const value = Math.round(percent)
            if (value === job.progress) return
            job.progress = value
            // El progreso no se guarda en disco: solo se avisa al renderer.
            this.changed(false)
          }
        })
      }
    } catch {
      outcome = { status: 'error', error: 'unknown' }
    }
    // Pudo cancelarse mientras se miraba si saltarlo o antes de que whisper arrancara.
    if (current.cancelled && outcome !== 'skipped') outcome = { status: 'cancelled' }

    this.current = null
    delete job.progress
    if (outcome === 'skipped') {
      job.status = 'done'
      job.skipped = true
    } else {
      job.status = outcome.status
      if (outcome.status === 'error') {
        job.error = outcome.error
        this.tally.errors++
      } else if (outcome.status === 'done') {
        this.tally.done++
      }
    }
    this.changed()
  }

  /** Avisa al renderer y, si `persist`, guarda `queue.json`. */
  private changed(persist = true): void {
    if (this.closing) return
    if (persist) this.deps.store.save(() => this.jobs)
    this.deps.onChange(this.state())
  }
}
