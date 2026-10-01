import { randomUUID } from 'crypto'
import { basename } from 'path'
import { IpcChannel } from '@shared/ipc'
import type { Settings } from '@shared/settings'
import { transcribeOptionsFrom } from '@shared/settings'
import type {
  Backend,
  ErrorCode,
  HistoryEntry,
  HistoryStatus,
  LiveSessionInfo,
  Segment
} from '@shared/types'
import { AUTO_LANGUAGE } from '@shared/whisper'
import {
  BYTES_PER_SAMPLE,
  BYTES_PER_SEC,
  isSilent,
  MAX_WINDOW_SEC,
  nextWindowLength,
  pcmSeconds,
  shiftSegments
} from '../domain/liveWindows'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { HistoryRepository } from './ports/historyRepository'
import type { LivePcmFiles } from './ports/livePcmFiles'
import type { ChunkTranscriber } from './ports/transcription'

/**
 * Una grabación de Rebecca Listen que se transcribe mientras se graba (tarea 27): vigila el
 * `.pcm`, transcribe por ventanas lo que va llegando y, al terminar, deja la entrada del
 * historial como cualquier otra, apuntando a la grabación final.
 */

/** Cada cuánto se mira si el `.pcm` creció. */
const POLL_MS = 1000
/** Sin crecer y sin `--live-end` durante esto, Listen se cerró de golpe. */
const STALL_MS = 2 * 60_000

/** Lo que la sesión necesita de fuera: historial, avisos, ajustes, motor de ventanas y disco. */
export interface LiveDeps {
  history: HistoryRepository
  publisher: EventPublisher
  log: Logger
  settings: () => Settings
  /** Cuenta la sesión como transcripción en marcha; devuelve con qué soltarla. */
  hold: (id: string) => () => void
  chunks: ChunkTranscriber
  files: LivePcmFiles
  /** Duración del medio final, o `null` si no se pudo leer. */
  mediaDuration: (path: string) => Promise<number | null>
  currentBackend: () => Promise<Backend>
}

export class LiveSession {
  readonly jobId = randomUUID()
  /** Bytes del `.pcm` ya transcritos (o saltados por silencio). */
  private offset = 0
  private size = 0
  private lastGrowth = Date.now()
  private ended = false
  private interrupted = false
  private media: string | null = null
  /** Cancelada o fallida: lo que siga llegando ya no se transcribe. */
  private outcome: HistoryStatus = 'transcribing'
  private busy = false
  private finished = false
  private chunks = 0
  private currentChunk: string | null = null
  private backend: Backend | null = null
  private readonly segments: Segment[] = []
  private readonly timer: NodeJS.Timeout
  private readonly release: () => void

  private constructor(
    private readonly deps: LiveDeps,
    readonly pcm: string,
    private entry: HistoryEntry,
    private readonly settings: Settings,
    /** Idioma de las ventanas: el de ajustes, o el detectado en la primera si era `auto`. */
    private language: string,
    private readonly onFinished: (session: LiveSession) => void
  ) {
    this.release = deps.hold(this.jobId)
    this.timer = setInterval(() => void this.tick(), POLL_MS)
    void this.tick()
  }

  /** Crea la entrada "en vivo" del historial y empieza a vigilar el `.pcm`. */
  static async start(
    deps: LiveDeps,
    pcm: string,
    name: string,
    onFinished: (session: LiveSession) => void
  ): Promise<LiveSession> {
    const settings = deps.settings()
    const entry = await deps.history.create({
      filePath: pcm,
      fileName: name,
      durationSec: 0,
      model: settings.model,
      language: settings.language,
      translate: settings.translate,
      status: 'transcribing',
      live: true
    })
    deps.log.info(`En vivo: empieza "${name}" (${pcm})`)
    const session = new LiveSession(deps, pcm, entry, settings, settings.language, onFinished)
    deps.publisher.publish(IpcChannel.HistoryAdded, entry)
    deps.publisher.publish(IpcChannel.LiveStarted, session.info())
    return session
  }

  /** El guardado en disco nunca debe cortar la sesión: los fallos van al log. */
  private persist(what: string, promise: Promise<unknown>): void {
    promise.catch((err) => this.deps.log.error(`En vivo: no se pudo ${what}`, err))
  }

  info(): LiveSessionInfo {
    return { jobId: this.jobId, entry: this.entry, segments: [...this.segments] }
  }

  /** `--live-end`: transcribe lo que falte y cierra. Sin `media`, la grabación se abortó. */
  end(media: string | null): void {
    if (this.ended) return
    this.ended = true
    this.media = media
    void this.tick()
  }

  /** "Cancelar" en la vista: deja de transcribir, pero la entrada espera a la grabación final. */
  cancel(): void {
    this.stop('cancelled')
  }

  private stop(code: ErrorCode): void {
    if (this.outcome !== 'transcribing') return
    this.outcome = code === 'cancelled' ? 'cancelled' : 'error'
    if (this.currentChunk) this.deps.chunks.cancel(this.currentChunk)
    this.persist(
      'guardar el estado',
      this.deps.history.update(this.entry.id, { status: this.outcome })
    )
    this.deps.publisher.publish(IpcChannel.TranscribeError, { jobId: this.jobId, code })
  }

  private async tick(): Promise<void> {
    if (this.busy || this.finished) return
    this.busy = true
    try {
      await this.readSize()
      if (!this.ended && Date.now() - this.lastGrowth > STALL_MS) {
        this.deps.log.warn(`En vivo: ${this.pcm} lleva ${STALL_MS / 1000} s sin crecer; se cierra`)
        this.interrupted = true
        this.ended = true
      }
      // Mientras whisper trabajaba siguió llegando audio: se vuelve a medir antes de cada ventana.
      while (await this.transcribeNext()) await this.readSize()
      if (this.ended && this.offset >= this.size) await this.finish()
    } catch (err) {
      this.deps.log.error('En vivo: fallo al leer o transcribir', err)
    } finally {
      this.busy = false
    }
  }

  private async readSize(): Promise<void> {
    // Si el `.pcm` desaparece, el tamaño se queda y la vigilancia cierra la sesión.
    const bytes = await this.deps.files.size(this.pcm)
    if (bytes === null) return
    const size = bytes - (bytes % BYTES_PER_SAMPLE)
    if (size > this.size) {
      this.size = size
      this.lastGrowth = Date.now()
    }
  }

  /** Transcribe la siguiente ventana si ya hay audio para ella. `false` si hay que esperar. */
  private async transcribeNext(): Promise<boolean> {
    const available = this.size - this.offset
    if (available <= 0) return false
    if (this.outcome !== 'transcribing') {
      this.offset = this.size
      return false
    }
    const bytes = await this.deps.files.read(
      this.pcm,
      this.offset,
      Math.min(available, MAX_WINDOW_SEC * BYTES_PER_SEC)
    )
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / BYTES_PER_SAMPLE)
    const length = nextWindowLength(samples, this.ended)
    if (length === null) return false
    const offsetSec = pcmSeconds(this.offset)
    this.offset += length * BYTES_PER_SAMPLE
    if (!isSilent(samples.subarray(0, length))) {
      await this.transcribeWindow(bytes.subarray(0, length * BYTES_PER_SAMPLE), offsetSec)
    }
    return true
  }

  private async transcribeWindow(pcm: Uint8Array, offsetSec: number): Promise<void> {
    const id = `${this.jobId}-${++this.chunks}`
    const wav = await this.deps.files.writeWindow(this.jobId, id, pcm)
    this.currentChunk = id
    const result = await this.deps.chunks
      .transcribe(
        {
          id,
          filePath: wav,
          model: this.settings.model,
          language: this.language,
          translate: this.settings.translate,
          options: transcribeOptionsFrom(this.settings)
        },
        (segments) => this.add(shiftSegments(segments, offsetSec))
      )
      .finally(() => (this.currentChunk = null))
    await this.deps.files.remove(wav)
    if (!result.ok) {
      if (result.code !== 'cancelled') this.stop(result.code)
      return
    }
    this.backend = result.backend
    // Cada ventana es corta: se fija el idioma de la primera para no saltar de uno a otro.
    this.language = result.language
  }

  private add(segments: Segment[]): void {
    if (segments.length === 0 || this.outcome !== 'transcribing') return
    this.segments.push(...segments)
    this.persist('guardar segmentos', this.deps.history.appendSegments(this.entry.id, segments))
    this.deps.publisher.publish(IpcChannel.TranscribeSegment, { jobId: this.jobId, segments })
  }

  private async durationSec(): Promise<number> {
    const duration = this.media ? await this.deps.mediaDuration(this.media) : null
    return duration ?? pcmSeconds(this.size)
  }

  /** La entrada pasa a ser una transcripción normal de la grabación final, y el `.pcm` se borra. */
  private async finish(): Promise<void> {
    this.finished = true
    clearInterval(this.timer)
    try {
      await this.close()
    } finally {
      await this.deps.files.cleanup(this.jobId, this.pcm)
      this.release()
      this.onFinished(this)
    }
  }

  private async close(): Promise<void> {
    const status = this.outcome === 'transcribing' ? 'done' : this.outcome
    const backend = this.backend ?? (await this.deps.currentBackend())
    const store = this.deps.history
    await store.setSegments(this.entry.id, this.segments)
    const updated = await store.update(this.entry.id, {
      ...(this.media ? { filePath: this.media, fileName: basename(this.media) } : {}),
      durationSec: await this.durationSec(),
      status,
      backend,
      live: undefined,
      ...(this.entry.language === AUTO_LANGUAGE && this.language !== AUTO_LANGUAGE
        ? { detectedLanguage: this.language }
        : {})
    })
    await store.flush()
    this.entry = updated ?? this.entry
    this.deps.log.info(`En vivo: termina "${this.entry.fileName}" (${status})`)
    if (status === 'done') {
      this.deps.publisher.publish(IpcChannel.TranscribeDone, {
        jobId: this.jobId,
        segments: this.segments,
        language: this.language,
        backend
      })
    }
    this.deps.publisher.publish(IpcChannel.LiveEnded, {
      jobId: this.jobId,
      entry: this.entry,
      interrupted: this.interrupted
    })
  }
}
