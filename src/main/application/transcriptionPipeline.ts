import { EventEmitter } from 'events'
import { AUTO_LANGUAGE } from '@shared/whisper'
import type {
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob,
  TranscribePhase,
  TranscribeProgressEvent,
  TranscribeSegmentEvent
} from '@shared/types'
import { withBackendFallback } from '../domain/fallback'
import { TranscribeError, toErrorCode } from '../domain/transcribeError'
import { whisperArgs } from '../domain/whisperArgs'
import type { BackendService } from './backendService'
import type { ModelService } from './modelService'
import type { BackendBinaries } from './ports/backendBinaries'
import type { Logger } from './ports/eventPublisher'
import type { MediaTools } from './ports/mediaTools'
import type { TempWorkspace } from './ports/tempWorkspace'
import type { TranscriptionEngineEvents, TranscriptionEnginePort } from './ports/transcription'
import type { WhisperProcess } from './ports/whisperProcess'

/** Parte del porcentaje total que se lleva la preparación del audio (probe + WAV). */
const PREPARING_SHARE = 5

export interface TranscriptionPipelineDeps {
  media: MediaTools
  temp: TempWorkspace
  whisper: WhisperProcess
  binaries: BackendBinaries
  backends: BackendService
  models: ModelService
  log: Logger
}

/**
 * Pipeline completo de un trabajo (spec §2.3): probe → WAV → whisper-cli, con streaming de
 * segmentos y progreso en vivo. `start()` no lanza: cualquier fallo termina en el evento `error`.
 * Los procesos (ffmpeg, whisper-cli) están detrás de los puertos `MediaTools` y `WhisperProcess`.
 */
export class TranscriptionPipeline extends EventEmitter implements TranscriptionEnginePort {
  private readonly active = new Map<string, AbortController>()

  constructor(private readonly deps: TranscriptionPipelineDeps) {
    super()
  }

  override on<K extends keyof TranscriptionEngineEvents>(
    event: K,
    listener: (e: TranscriptionEngineEvents[K]) => void
  ): this {
    return super.on(event, listener)
  }

  override off<K extends keyof TranscriptionEngineEvents>(
    event: K,
    listener: (e: TranscriptionEngineEvents[K]) => void
  ): this {
    return super.off(event, listener)
  }

  /** Ejecuta el pipeline completo del trabajo. Nunca rechaza: los fallos emiten `error`. */
  async start(job: TranscribeJob): Promise<void> {
    const { media, temp, whisper, binaries, backends, models, log } = this.deps
    const controller = new AbortController()
    const { signal } = controller
    this.active.set(job.id, controller)
    let releaseModel = (): void => {}

    try {
      const modelPath = await models.resolvePath(job.model)
      if (!modelPath) throw new TranscribeError('modelMissing')
      releaseModel = models.acquire(job.model)

      this.emitProgress(job.id, 'preparing', 0)
      const info = await media.probe(job.filePath)
      const wav = await media.toWav(job.filePath, {
        outDir: temp.dir(job.id),
        track: job.audioTrack,
        normalize: job.options?.normalize,
        durationSec: info.durationSec,
        signal,
        onProgress: (percent) =>
          this.emitProgress(job.id, 'preparing', Math.round((percent * PREPARING_SHARE) / 100))
      })
      if (signal.aborted) throw new TranscribeError('cancelled')

      const language = job.language || AUTO_LANGUAGE
      const backendInfo = await backends.info()
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
          const cli = binaries.cliPath(b)
          log.info(`Transcripción ${job.id}: ${cli} ${args.join(' ')}`)
          const release = backends.acquire(b)
          return whisper
            .run(
              {
                backend: b,
                cli,
                args,
                onSegment: (segment) =>
                  this.emitTyped('segment', {
                    jobId: job.id,
                    segments: [segment]
                  } satisfies TranscribeSegmentEvent),
                onProgress: (percent) =>
                  this.emitProgress(
                    job.id,
                    'transcribing',
                    PREPARING_SHARE + Math.round((percent * (100 - PREPARING_SHARE)) / 100)
                  )
              },
              signal
            )
            .finally(release)
        },
        backends.notifyFallback
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
      releaseModel()
      this.active.delete(job.id)
      await temp.remove(job.id).catch(() => {})
    }
  }

  /** Aborta el trabajo: mata whisper-cli (si hay uno vivo) y la etapa de ffmpeg. */
  cancel(jobId: string): void {
    this.active.get(jobId)?.abort()
  }

  /** Cancela todo lo que esté en marcha (al cerrar la app). */
  cancelAll(): void {
    for (const jobId of this.active.keys()) this.cancel(jobId)
  }

  private emitTyped<K extends keyof TranscriptionEngineEvents>(
    event: K,
    payload: TranscriptionEngineEvents[K]
  ): void {
    super.emit(event, payload)
  }

  private emitProgress(jobId: string, phase: TranscribePhase, percent: number): void {
    this.emitTyped('progress', {
      jobId,
      phase,
      percent: Math.min(100, Math.max(0, percent))
    } satisfies TranscribeProgressEvent)
  }
}
