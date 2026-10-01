import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { mkdir, readdir, rename, rm, stat, utimes } from 'fs/promises'
import { constants as osConstants, setPriority } from 'os'
import { join, sep } from 'path'
import { createProgressParser } from '../../domain/media'
import {
  audioEncoders,
  audioPreviewArgs,
  pickEvictions,
  previewKey,
  videoPreviewArgs,
  type CacheFile,
  type PreviewPlan
} from '../../domain/previewPlan'
import type { PreviewCacheEvents, PreviewProgress } from '../../application/ports/previewGenerator'
import { ffmpegPath } from './ffmpegTools'

/**
 * Caché de vistas previas para lo que Chromium no reproduce (spec §4.1, tarea 11).
 * No importa `electron`: la carpeta y el límite los decide quien la crea (`PreviewService`).
 *
 * Archivos en la carpeta:
 * - `<clave>.mp4`: vista previa H.264 + AAC de un video.
 * - `<clave>.m4a`: audio AAC de un archivo de solo audio que Chromium no lee (wma, amr...).
 * - `<clave>.tmp-audio.m4a`: audio provisional mientras se genera el `.mp4`. Se borra en la
 *   siguiente generación, al vaciar la caché o al arrancar.
 * - `*.part`: salida a medias de ffmpeg; se renombra al terminar (escritura atómica).
 *
 * El uso se marca con la fecha de modificación (`utimes` al abrir), porque Windows no
 * actualiza `atime` de forma fiable. Al pasarse del límite se borra lo menos usado.
 */

const TMP_AUDIO = '.tmp-audio.m4a'

function isLeftover(name: string): boolean {
  return name.endsWith('.part') || name.endsWith(TMP_AUDIO)
}

export interface PreviewCacheOptions {
  dir: string
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

export class PreviewCacheError extends Error {
  constructor(readonly detail: string) {
    super(detail)
    this.name = 'PreviewCacheError'
  }
}

/**
 * Genera y guarda vistas previas. El audio provisional se saca en cuanto se pide (tarda
 * segundos); los videos van de uno en uno y con prioridad baja, el último pedido primero.
 */
export class PreviewCache extends EventEmitter<PreviewCacheEvents> {
  private readonly dir: string
  private readonly maxBytes: () => number | Promise<number>
  private ready: Promise<void> | null = null
  private readonly jobs = new Map<string, Job>()
  private queue: Job[] = []
  private running: Job | null = null
  private readonly children = new Set<ChildProcess>()
  /** Se incrementa al vaciar la caché: los trabajos de antes ya no emiten ni guardan nada. */
  private generation = 0

  constructor(options: PreviewCacheOptions) {
    super()
    this.dir = options.dir
    this.maxBytes = options.maxBytes
  }

  /** Crea la carpeta y borra lo que dejó a medias un cierre anterior. */
  private init(): Promise<void> {
    this.ready ??= (async () => {
      await mkdir(this.dir, { recursive: true })
      for (const name of await readdir(this.dir)) {
        if (isLeftover(name)) await rm(join(this.dir, name), { force: true })
      }
    })()
    return this.ready
  }

  async keyFor(input: string): Promise<string> {
    const info = await stat(input)
    return previewKey(input, info.size, info.mtimeMs)
  }

  private finalPath(key: string, plan: PreviewPlan): string {
    return join(this.dir, `${key}${plan.audioOnly ? '.m4a' : '.mp4'}`)
  }

  /**
   * Vista previa ya generada de `input` (y la marca como usada), o `null`. Si se está
   * generando, `pending` dice cómo va.
   */
  async lookup(
    input: string,
    plan: PreviewPlan
  ): Promise<{ path: string } | { pending: PreviewProgress } | null> {
    await this.init()
    const key = await this.keyFor(input)
    const path = this.finalPath(key, plan)
    try {
      await stat(path)
      const now = new Date()
      await utimes(path, now, now).catch(() => {})
      return { path }
    } catch {
      const job = this.jobs.get(key)
      return job ? { pending: { ...job.state } } : null
    }
  }

  /**
   * Pide la vista previa de `input`. Si ya se está haciendo no arranca otra; si está en
   * cola la pasa al principio. El resultado llega por los eventos.
   */
  async request(input: string, plan: PreviewPlan, durationSec: number): Promise<void> {
    await this.init()
    const key = await this.keyFor(input)
    const existing = this.jobs.get(key)
    if (existing) {
      if (this.queue.includes(existing)) {
        this.queue = [existing, ...this.queue.filter((j) => j !== existing)]
      }
      return
    }
    const job: Job = { key, input, durationSec, plan, state: { audioPath: null, percent: 0 } }
    this.jobs.set(key, job)
    const generation = this.generation

    if (plan.audioOnly) {
      // Un archivo de solo audio no necesita paso provisional: su m4a es la vista previa.
      this.queue.unshift(job)
      this.pump()
      return
    }
    if (plan.audio !== 'original') {
      const audioPath = join(this.dir, `${key}${TMP_AUDIO}`)
      try {
        await this.extractAudio(job, audioPath, plan.audio === 'copy', generation)
      } catch {
        // Sin audio provisional se sigue con el video: se oirá cuando esté la vista previa.
      }
      if (generation !== this.generation) return
    }
    this.queue.unshift(job)
    this.pump()
  }

  private async extractAudio(
    job: Job,
    audioPath: string,
    copy: boolean,
    generation: number
  ): Promise<void> {
    const part = `${audioPath}.part`
    await this.runAudio(job, part, copy, generation, () => {})
    await rename(part, audioPath)
    if (generation !== this.generation) return
    job.state.audioPath = audioPath
    this.emit('audio', job.input, audioPath)
  }

  /** Saca el audio a `part` probando los codificadores en orden; si todos fallan, lanza. */
  private async runAudio(
    job: Job,
    part: string,
    copy: boolean,
    generation: number,
    onProgress: (percent: number) => void
  ): Promise<void> {
    // Algún aac/mp3 raro no se deja copiar a mp4 y aac_mf puede faltar: se prueba el siguiente.
    const encoders = audioEncoders(copy)
    for (const [i, encoder] of encoders.entries()) {
      try {
        await this.run(audioPreviewArgs(job.input, part, encoder), job.durationSec, onProgress)
        return
      } catch (err) {
        await rm(part, { force: true })
        if (i === encoders.length - 1 || generation !== this.generation) throw err
      }
    }
  }

  private pump(): void {
    if (this.running) return
    const job = this.queue.shift()
    if (!job) return
    this.running = job
    const generation = this.generation
    void this.generate(job)
      .catch((err) => {
        if (generation === this.generation) this.emit('failed', job.input, toError(err))
      })
      .finally(() => {
        if (generation !== this.generation) return
        this.jobs.delete(job.key)
        this.running = null
        this.pump()
      })
  }

  private async generate(job: Job): Promise<void> {
    const generation = this.generation
    await this.removeTempAudio(job.key)
    const out = this.finalPath(job.key, job.plan)
    const part = `${out}.part`
    const onProgress = (percent: number): void => {
      job.state.percent = percent
      this.emit('progress', job.input, percent)
    }
    try {
      if (job.plan.audioOnly) {
        await this.runAudio(job, part, job.plan.audio === 'copy', generation, onProgress)
      } else {
        await this.run(videoPreviewArgs(job.input, part), job.durationSec, onProgress)
      }
      await rename(part, out)
    } catch (err) {
      await rm(part, { force: true })
      throw err
    }
    if (generation !== this.generation) return
    await this.enforceLimit([out])
    this.emit('ready', job.input, out)
  }

  /** Audio provisional de otros archivos que ya no se necesita (el propio sigue sonando). */
  private async removeTempAudio(exceptKey: string): Promise<void> {
    const pending = new Set([...this.jobs.keys()])
    pending.add(exceptKey)
    for (const name of await readdir(this.dir).catch(() => [])) {
      if (!name.endsWith(TMP_AUDIO)) continue
      if (pending.has(name.slice(0, -TMP_AUDIO.length))) continue
      await rm(join(this.dir, name), { force: true }).catch(() => {})
    }
  }

  /** Ejecuta ffmpeg con prioridad baja. Rechaza si falla o si se vacía la caché. */
  private run(args: string[], durationSec: number, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath(), args, { windowsHide: true })
      this.children.add(child)
      if (child.pid !== undefined) {
        try {
          setPriority(child.pid, osConstants.priority.PRIORITY_BELOW_NORMAL)
        } catch {
          // Si el sistema no deja cambiarla, se genera igual con prioridad normal.
        }
      }
      const parse = createProgressParser(durationSec, onProgress)
      let stderr = ''
      child.stdout?.on('data', (d: Buffer) => parse(d.toString('utf8')))
      child.stderr?.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
      child.on('error', (err) => {
        this.children.delete(child)
        reject(err)
      })
      // Se espera a `close` para que Windows suelte el `.part` antes de renombrarlo o borrarlo.
      child.on('close', (code, signal) => {
        this.children.delete(child)
        if (code === 0) resolve()
        else reject(new PreviewCacheError(signal ? `ffmpeg terminado (${signal})` : tail(stderr)))
      })
    })
  }

  /** Archivos terminados, incluido el audio provisional (sin los `.part` en curso). */
  private async files(): Promise<CacheFile[]> {
    const names = await readdir(this.dir).catch(() => [] as string[])
    const files: CacheFile[] = []
    for (const name of names) {
      if (name.endsWith('.part')) continue
      try {
        const info = await stat(join(this.dir, name))
        if (info.isFile()) files.push({ name, size: info.size, mtimeMs: info.mtimeMs })
      } catch {
        // Borrado mientras tanto.
      }
    }
    return files
  }

  /**
   * Borra lo menos usado hasta quedar dentro del límite. `keep`: rutas que no se tocan.
   * El audio provisional cuenta para el límite, pero el de los trabajos en curso se conserva
   * (puede estar sonando hasta que el renderer cambie a la vista previa).
   */
  async enforceLimit(keep: string[] = []): Promise<void> {
    await this.init()
    const max = await this.maxBytes()
    const keepNames = [
      ...keep.map((p) => p.slice(p.lastIndexOf(sep) + 1)),
      ...[...this.jobs.keys()].map((key) => `${key}${TMP_AUDIO}`)
    ]
    for (const name of pickEvictions(await this.files(), max, keepNames)) {
      await rm(join(this.dir, name), { force: true }).catch(() => {})
    }
  }

  /** Bytes que ocupa la caché, incluidos el audio provisional y los `.part` en curso. */
  async size(): Promise<number> {
    await this.init()
    let total = 0
    for (const name of await readdir(this.dir).catch(() => [] as string[])) {
      total += await stat(join(this.dir, name)).then(
        (s) => s.size,
        () => 0
      )
    }
    return total
  }

  /** Mata las generaciones en curso sin esperar (al cerrar la app). */
  dispose(): void {
    this.generation++
    this.queue = []
    this.jobs.clear()
    this.running = null
    for (const child of this.children) child.kill()
  }

  /**
   * Vacía la caché ("Borrar historial" y "Vaciar caché"): cancela lo que se esté generando
   * y borra todos los archivos. Nunca toca nada fuera de su carpeta.
   */
  async clear(): Promise<void> {
    await this.init()
    const children = [...this.children]
    this.dispose()
    await Promise.all(
      children.map((c) =>
        c.exitCode !== null || c.signalCode !== null
          ? null
          : new Promise((resolve) => c.once('close', resolve))
      )
    )
    for (const name of await readdir(this.dir).catch(() => [] as string[])) {
      await rm(join(this.dir, name), { force: true, recursive: true }).catch(() => {})
    }
  }
}

function tail(text: string, count = 5): string {
  return text.trim().split(/\r?\n/).slice(-count).join(' | ') || 'ffmpeg falló'
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}
