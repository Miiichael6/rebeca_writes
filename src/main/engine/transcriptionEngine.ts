import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { rm } from 'fs/promises'
import log from 'electron-log/main'
import { AUTO_LANGUAGE } from '@shared/whisper'
import type {
  Backend,
  ErrorCode,
  Segment,
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob,
  TranscribeOptions,
  TranscribePhase,
  TranscribeProgressEvent,
  TranscribeSegmentEvent
} from '@shared/types'
import { probe, toWav, MediaError } from '../services/ffmpeg'
import { jobTempDir } from '../services/tempFiles'
import { resolveModelPath } from '../services/models'
import { getBackendInfo, notifyFallback } from './backend'
import {
  BackendLoadError,
  BackendNotInstalledError,
  detectLoadFailure,
  withBackendFallback
} from './fallback'
import { LineSplitter, parseDetectedLanguage, parseProgress, parseSegmentLine } from './parsers'
import { getWhisperCli } from './paths'

/**
 * Pipeline completo de un trabajo (spec §2.3): probe → WAV → whisper-cli, con streaming de
 * segmentos y progreso en vivo. `start()` no lanza: cualquier fallo termina en el evento `error`.
 */

/** Errores del propio motor (fuera de los que ya da `probe`/`toWav`). */
export class TranscribeError extends Error {
  constructor(
    readonly code: Extract<
      ErrorCode,
      'modelMissing' | 'backendFailed' | 'noDiskSpace' | 'cancelled'
    >,
    readonly detail = ''
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'TranscribeError'
  }
}

function lastLines(text: string, count = 5): string {
  return text.trim().split(/\r?\n/).slice(-count).join(' | ')
}

/** `taskkill /T /F` en Windows para no dejar procesos hijos huérfanos; `kill` en el resto. */
function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Ya había terminado.
    }
  }
}

function whisperArgs(opts: {
  model: string
  wav: string
  language: string
  translate?: boolean
  options?: TranscribeOptions
}): string[] {
  const o = opts.options ?? {}
  return [
    '-m', opts.model, '-f', opts.wav, '-l', opts.language, '-pp',
    ...(o.prompt ? ['--prompt', o.prompt] : []),
    ...(o.maxLen ? ['-ml', String(o.maxLen)] : []),
    ...(o.suppressNst ? ['--suppress-nst'] : []),
    ...(opts.translate ? ['-tr'] : []),
    ...(o.threads ? ['-t', String(o.threads)] : [])
  ] // prettier-ignore
}

function toErrorCode(err: unknown): { code: ErrorCode; detail: string } {
  if (err instanceof TranscribeError) return { code: err.code, detail: err.detail }
  if (err instanceof MediaError) return { code: err.code, detail: err.detail }
  if (err instanceof BackendNotInstalledError) return { code: 'backendFailed', detail: err.message }
  if (err instanceof Error && err.name === 'AbortError') return { code: 'cancelled', detail: '' }
  if (err && typeof err === 'object' && (err as NodeJS.ErrnoException).code === 'ENOSPC') {
    return { code: 'noDiskSpace', detail: '' }
  }
  return { code: 'unknown', detail: err instanceof Error ? err.message : String(err) }
}

interface ActiveJob {
  child: ChildProcess | null
  cancelled: boolean
  abortController: AbortController
}

interface WhisperResult {
  segments: Segment[]
  /** `null` si whisper no imprimió la línea de auto-detección (idioma pedido explícito). */
  detectedLanguage: string | null
}

interface TranscriptionEngineEvents {
  segment: TranscribeSegmentEvent
  progress: TranscribeProgressEvent
  done: TranscribeDoneEvent
  error: TranscribeErrorEvent
}

export class TranscriptionEngine extends EventEmitter {
  private readonly active = new Map<string, ActiveJob>()

  override on<K extends keyof TranscriptionEngineEvents>(
    event: K,
    listener: (e: TranscriptionEngineEvents[K]) => void
  ): this {
    return super.on(event, listener)
  }

  private emitTyped<K extends keyof TranscriptionEngineEvents>(
    event: K,
    payload: TranscriptionEngineEvents[K]
  ): void {
    super.emit(event, payload)
  }

  /** Ejecuta el pipeline completo del trabajo. Nunca rechaza: los fallos emiten `error`. */
  async start(job: TranscribeJob): Promise<void> {
    const tempDir = jobTempDir(job.id)
    const active: ActiveJob = {
      child: null,
      cancelled: false,
      abortController: new AbortController()
    }
    this.active.set(job.id, active)

    try {
      const modelPath = await resolveModelPath(job.model)
      if (!modelPath) throw new TranscribeError('modelMissing')

      this.emitProgress(job.id, 'preparing', 0)
      const info = await probe(job.filePath)
      const wav = await toWav(job.filePath, {
        outDir: tempDir,
        track: job.audioTrack,
        normalize: job.options?.normalize,
        durationSec: info.durationSec,
        signal: active.abortController.signal,
        onProgress: (percent) => this.emitProgress(job.id, 'preparing', Math.round(percent * 0.05))
      })
      if (active.cancelled) throw new TranscribeError('cancelled')

      const language = job.language || AUTO_LANGUAGE
      const backendInfo = await getBackendInfo()
      const { result, backend } = await withBackendFallback(
        backendInfo.backend,
        backendInfo.installed,
        (b) => {
          const args = whisperArgs({
            model: modelPath,
            wav,
            language,
            translate: job.translate,
            options: job.options
          })
          log.info(`Transcripción ${job.id}: whisper-cli (${b}) ${args.join(' ')}`)
          return this.runWhisper(job.id, active, b, getWhisperCli(b), args)
        },
        notifyFallback
      )

      this.emitProgress(job.id, 'transcribing', 100)
      this.emitTyped('done', {
        jobId: job.id,
        segments: result.segments,
        language: language === AUTO_LANGUAGE ? (result.detectedLanguage ?? language) : language,
        backend
      } satisfies TranscribeDoneEvent)
    } catch (err) {
      const { code, detail } = toErrorCode(err)
      log.error(`Transcripción ${job.id} falló (${code})`, detail)
      this.emitTyped('error', { jobId: job.id, code, detail } satisfies TranscribeErrorEvent)
    } finally {
      this.active.delete(job.id)
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /** Mata el proceso de whisper-cli (si hay uno vivo) y aborta la etapa de ffmpeg. */
  cancel(jobId: string): void {
    const active = this.active.get(jobId)
    if (!active) return
    active.cancelled = true
    active.abortController.abort()
    if (active.child?.pid) killTree(active.child.pid)
  }

  /** Cancela todo lo que esté en marcha (al cerrar la app). */
  cancelAll(): void {
    for (const jobId of this.active.keys()) this.cancel(jobId)
  }

  private emitProgress(jobId: string, phase: TranscribePhase, percent: number): void {
    this.emitTyped('progress', {
      jobId,
      phase,
      percent: Math.min(100, Math.max(0, percent))
    } satisfies TranscribeProgressEvent)
  }

  /** Ejecuta whisper-cli y resuelve con los segmentos, emitiendo `segment`/`progress` en vivo. */
  private runWhisper(
    jobId: string,
    active: ActiveJob,
    backend: Backend,
    cli: string,
    args: string[]
  ): Promise<WhisperResult> {
    return new Promise((resolve, reject) => {
      const started = Date.now()
      const segments: Segment[] = []
      let detectedLanguage: string | null = null
      let stderrBuf = ''
      let producedSegments = false

      const child = spawn(cli, args, { windowsHide: true })
      active.child = child

      const outSplitter = new LineSplitter((line) => {
        const segment = parseSegmentLine(line)
        if (!segment) return
        segments.push(segment)
        producedSegments = true
        this.emitTyped('segment', { jobId, segments: [segment] } satisfies TranscribeSegmentEvent)
      })
      const errSplitter = new LineSplitter((line) => {
        stderrBuf += line + '\n'
        const percent = parseProgress(line)
        if (percent !== null)
          this.emitProgress(jobId, 'transcribing', 5 + Math.round(percent * 0.95))
        detectedLanguage ??= parseDetectedLanguage(line)
      })

      child.stdout.on('data', (d: Buffer) => outSplitter.push(d))
      child.stderr.on('data', (d: Buffer) => errSplitter.push(d))
      child.on('error', (err) => {
        active.child = null
        reject(err)
      })
      child.on('close', (code) => {
        outSplitter.flush()
        errSplitter.flush()
        active.child = null

        if (active.cancelled) {
          reject(new TranscribeError('cancelled'))
          return
        }
        const reason = detectLoadFailure({
          backend,
          stderr: stderrBuf,
          exitCode: code,
          elapsedMs: Date.now() - started,
          producedSegments
        })
        if (reason) {
          reject(new BackendLoadError(backend, reason))
          return
        }
        if (code !== 0) {
          reject(new TranscribeError('backendFailed', lastLines(stderrBuf)))
          return
        }
        resolve({ segments, detectedLanguage })
      })
    })
  }
}
