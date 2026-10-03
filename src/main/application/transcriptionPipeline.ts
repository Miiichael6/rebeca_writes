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
import type { SingleFileModel } from './singleFileModel'
import type { SpeakerEmbedder } from './ports/speakerEmbedder'
import { SpeakerLabeler } from './speakerLabeler'

/** Parte del porcentaje total que se lleva la preparación del audio (probe + WAV). */
const PREPARING_SHARE = 5

export interface TranscriptionPipelineDeps {
  media: MediaTools
  temp: TempWorkspace
  whisper: WhisperProcess
  binaries: BackendBinaries
  backends: BackendService
  models: ModelService
  /** Modelo del filtro de voz; si el trabajo lo pide y falta, se descarga (si falla, sin filtro). */
  vadModel: Pick<SingleFileModel, 'readyPath' | 'prepare'>
  log: Logger
  /**
   * "Detectar quién habla" para archivos ya grabados (tarea 35): si se pasa, al terminar whisper
   * cada segmento se etiqueta con su huella de voz. Las ventanas en vivo no lo reciben (las
   * etiqueta la sesión).
   */
  speakers?: { embedder: SpeakerEmbedder; enabled: () => boolean }
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

  /** Ruta del modelo del filtro de voz (lo descarga si falta), o `undefined` (con aviso) si no se pudo. */
  private async vadModelPath(jobId: string): Promise<string | undefined> {
    const { vadModel } = this.deps
    const ready = await vadModel.readyPath().catch(() => null)
    if (ready) return ready
    const downloaded = await vadModel.prepare().catch(() => null)
    const path = downloaded?.status === 'done' ? await vadModel.readyPath().catch(() => null) : null
    if (path) return path
    this.deps.log.warn(`Transcripción ${jobId}: falta el modelo del filtro de voz, sin VAD`)
    return undefined
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
      const vadModel = job.options?.vad ? await this.vadModelPath(job.id) : undefined
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
            options: job.options,
            vadModel
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

      let segments = result.segments
      const speakers = this.deps.speakers
      if (speakers?.enabled() && !signal.aborted) {
        segments = await new SpeakerLabeler(speakers.embedder, null)
          .label(wav, segments, 0)
          .catch((err) => {
            log.warn(`Transcripción ${job.id}: no se pudo detectar quién habla`, err)
            return result.segments
          })
      }

      this.emitProgress(job.id, 'transcribing', 100)
      this.emitTyped('done', {
        jobId: job.id,
        segments,
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
