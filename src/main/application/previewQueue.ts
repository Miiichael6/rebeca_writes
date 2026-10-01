import { EventEmitter } from 'events'
import {
  audioEncoders,
  audioPreviewArgs,
  keyOfTmpAudio,
  partName,
  pickEvictions,
  previewFileName,
  tmpAudioName,
  videoPreviewArgs,
  type PreviewPlan
} from '../domain/previewPlan'
import type { PreviewEncoder } from './ports/previewEncoder'
import type {
  PreviewCacheEvents,
  PreviewGenerator,
  PreviewProgress
} from './ports/previewGenerator'
import type { PreviewStore } from './ports/previewStore'

/**
 * Caché de vistas previas para lo que Chromium no reproduce (spec §4.1, tarea 11). El audio
 * provisional se saca en cuanto se pide (tarda segundos); los videos van de uno en uno, el
 * último pedido primero. El uso se marca con la fecha de modificación y, al pasarse del
 * límite, se borra lo menos usado.
 */

export interface PreviewQueueDeps {
  store: PreviewStore
  encoder: PreviewEncoder
  /** Límite en bytes; se lee en cada limpieza para seguir los cambios de Configuración. */
  maxBytes: () => number | Promise<number>
}

interface Job {
  key: string
  input: string
  durationSec: number
  plan: PreviewPlan
  state: PreviewProgress
}

/** Argumentos de ffmpeg para una salida; se prueban en orden hasta que uno funciona. */
type ArgsFor = (out: string) => string[]

export class PreviewQueue extends EventEmitter<PreviewCacheEvents> implements PreviewGenerator {
  private readonly store: PreviewStore
  private readonly encoder: PreviewEncoder
  private readonly maxBytes: () => number | Promise<number>
  private prepared: Promise<void> | null = null
  private readonly jobs = new Map<string, Job>()
  private queue: Job[] = []
  private running: Job | null = null
  /** Se aborta al vaciar la caché o al salir: lo pedido antes ya no emite ni guarda nada. */
  private epoch = new AbortController()
  /** Codificaciones en curso; `clear` espera a que suelten sus archivos antes de borrar. */
  private readonly encodings = new Set<Promise<void>>()

  constructor({ store, encoder, maxBytes }: PreviewQueueDeps) {
    super()
    this.store = store
    this.encoder = encoder
    this.maxBytes = maxBytes
  }

  async lookup(
    input: string,
    plan: PreviewPlan
  ): Promise<{ path: string } | { pending: PreviewProgress } | null> {
    const key = await this.keyFor(input)
    const name = previewFileName(key, plan)
    if (await this.store.touch(name)) return { path: this.store.pathOf(name) }
    const job = this.jobs.get(key)
    return job ? { pending: { ...job.state } } : null
  }

  /**
   * Pide la vista previa de `input`. Si ya se está haciendo no arranca otra; si está en
   * cola la pasa al principio. El resultado llega por los eventos.
   */
  async request(input: string, plan: PreviewPlan, durationSec: number): Promise<void> {
    const key = await this.keyFor(input)
    const existing = this.jobs.get(key)
    if (existing) {
      this.promote(existing)
      return
    }
    const job: Job = { key, input, durationSec, plan, state: { audioPath: null, percent: 0 } }
    this.jobs.set(key, job)
    const { signal } = this.epoch

    // Un archivo de solo audio no necesita paso provisional: su m4a es la vista previa.
    if (!plan.audioOnly && plan.audio !== 'original') {
      // Sin audio provisional se sigue con el video: se oirá cuando esté la vista previa.
      await this.extractTempAudio(job, signal).catch(() => {})
      if (signal.aborted) return
    }
    this.queue.unshift(job)
    this.pump()
  }

  /**
   * Borra lo menos usado hasta quedar dentro del límite. `keep`: nombres que no se tocan.
   * El audio provisional cuenta para el límite, pero el de los trabajos en curso se conserva
   * (puede estar sonando hasta que el renderer cambie a la vista previa).
   */
  async enforceLimit(keep: readonly string[] = []): Promise<void> {
    await this.prepare()
    const keepNames = [...keep, ...[...this.jobs.keys()].map(tmpAudioName)]
    const victims = pickEvictions(await this.store.list(), await this.maxBytes(), keepNames)
    for (const name of victims) await this.store.remove(name)
  }

  async size(): Promise<number> {
    await this.prepare()
    return this.store.totalSize()
  }

  /** Mata las generaciones en curso sin esperar (al cerrar la app). */
  dispose(): void {
    this.epoch.abort()
    this.epoch = new AbortController()
    this.queue = []
    this.jobs.clear()
    this.running = null
  }

  /**
   * Vacía la caché ("Borrar historial" y "Vaciar caché"): cancela lo que se esté generando
   * y borra todos los archivos. Nunca toca los originales.
   */
  async clear(): Promise<void> {
    await this.prepare()
    const inFlight = [...this.encodings]
    this.dispose()
    await Promise.allSettled(inFlight)
    await this.store.removeAll()
  }

  private prepare(): Promise<void> {
    this.prepared ??= this.store.prepare()
    return this.prepared
  }

  private async keyFor(input: string): Promise<string> {
    await this.prepare()
    return this.store.keyFor(input)
  }

  private promote(job: Job): void {
    if (this.queue.includes(job)) this.queue = [job, ...this.queue.filter((j) => j !== job)]
  }

  private async extractTempAudio(job: Job, signal: AbortSignal): Promise<void> {
    const name = tmpAudioName(job.key)
    await this.encode(job, name, this.audioAttempts(job), signal, () => {})
    job.state.audioPath = this.store.pathOf(name)
    this.emit('audio', job.input, job.state.audioPath)
  }

  private pump(): void {
    if (this.running) return
    const job = this.queue.shift()
    if (!job) return
    this.running = job
    const { signal } = this.epoch
    void this.generate(job, signal)
      .catch((err) => {
        if (!signal.aborted) this.emit('failed', job.input, toError(err))
      })
      .finally(() => {
        if (signal.aborted) return
        this.jobs.delete(job.key)
        this.running = null
        this.pump()
      })
  }

  private async generate(job: Job, signal: AbortSignal): Promise<void> {
    await this.removeStaleTempAudio(job.key)
    const name = previewFileName(job.key, job.plan)
    const attempts = job.plan.audioOnly
      ? this.audioAttempts(job)
      : [(out: string) => videoPreviewArgs(job.input, out)]
    await this.encode(job, name, attempts, signal, (percent) => {
      job.state.percent = percent
      this.emit('progress', job.input, percent)
    })
    if (signal.aborted) return
    await this.enforceLimit([name])
    this.emit('ready', job.input, this.store.pathOf(name))
  }

  /** Algún aac/mp3 raro no se deja copiar a mp4 y aac_mf puede faltar: se prueba el siguiente. */
  private audioAttempts(job: Job): ArgsFor[] {
    return audioEncoders(job.plan.audio === 'copy').map(
      (encoder) => (out: string) => audioPreviewArgs(job.input, out, encoder)
    )
  }

  /**
   * Genera `name` a través de un `.part`, probando `attempts` en orden. Rechaza si todos
   * fallan o si se aborta; en ese caso no deja nada en la carpeta.
   */
  private encode(
    job: Job,
    name: string,
    attempts: ArgsFor[],
    signal: AbortSignal,
    onProgress: (percent: number) => void
  ): Promise<void> {
    const part = partName(name)
    const out = this.store.pathOf(part)
    const encoding = (async () => {
      for (const [i, argsFor] of attempts.entries()) {
        try {
          await this.encoder.run(argsFor(out), job.durationSec, onProgress, signal)
          signal.throwIfAborted()
          await this.store.commit(part, name)
          return
        } catch (err) {
          await this.store.remove(part)
          if (i === attempts.length - 1 || signal.aborted) throw err
        }
      }
    })()
    this.encodings.add(encoding)
    const untrack = (): void => void this.encodings.delete(encoding)
    encoding.then(untrack, untrack)
    return encoding
  }

  /** Audio provisional de otros archivos que ya no se necesita (el propio sigue sonando). */
  private async removeStaleTempAudio(exceptKey: string): Promise<void> {
    for (const { name } of await this.store.list()) {
      const key = keyOfTmpAudio(name)
      if (key !== null && key !== exceptKey && !this.jobs.has(key)) await this.store.remove(name)
    }
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}
