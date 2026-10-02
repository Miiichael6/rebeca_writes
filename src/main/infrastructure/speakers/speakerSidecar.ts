import { join } from 'path'
import type { Logger } from '../../application/ports/eventPublisher'
import type { SpeakerEmbedder } from '../../application/ports/speakerEmbedder'
import type { SpeakerModel } from '../../application/speakerModel'
import {
  parseSpeakerEvent,
  type SpeakerCommand,
  type SpeakerEvent
} from '../../domain/speakers/speakerProtocol'
import { RestartingSidecar } from '../sidecar/restartingSidecar'

/**
 * El sidecar en `resources/bin/speaker`, junto a las DLL de sherpa-onnx y onnxruntime que carga
 * (las deja ahí `npm run fetch:speaker`).
 */
export const SPEAKER_BINARY = join('speaker', 'rl-speaker.exe')

/** Hilos del extractor: una huella tarda ~50 ms con dos, sin quitarle CPU a whisper. */
const EMBED_THREADS = 2
/** Cargar el modelo tarda ~1 s; más que esto es que el sidecar no responde. */
const LOAD_TIMEOUT_MS = 30_000
const EMBED_TIMEOUT_MS = 10_000

/**
 * Adaptador de `SpeakerEmbedder` sobre `rl-speaker.exe` (tarea 35). Lo arranca y carga el modelo
 * con la primera huella; si el modelo aún no está descargado, empieza la descarga y mientras
 * tanto no hay huellas. Si se cae, lo que estaba pendiente queda sin huella y el siguiente
 * `embed` lo vuelve a arrancar.
 */
export class SpeakerSidecar implements SpeakerEmbedder {
  private readonly process: RestartingSidecar
  private loading: Promise<boolean> | null = null
  private settleLoad: ((ok: boolean) => void) | null = null
  private readonly pending = new Map<number, (vector: number[] | null) => void>()
  private nextId = 0
  /** Se cayó demasiadas veces seguidas: no se vuelve a intentar hasta `release`. */
  private gaveUp = false

  constructor(
    binaryPath: string,
    private readonly model: Pick<SpeakerModel, 'readyPath' | 'prepare'>,
    private readonly log: Logger
  ) {
    this.process = new RestartingSidecar(
      binaryPath,
      'Hablantes',
      {
        line: (line) => this.handleLine(line),
        retry: () => this.reset(),
        gaveUp: () => {
          this.gaveUp = true
          this.reset()
        }
      },
      log
    )
  }

  async embed(wav: string, start: number, end: number): Promise<number[] | null> {
    if (this.gaveUp || !(await this.load())) return null
    const id = ++this.nextId
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.settle(id, null), EMBED_TIMEOUT_MS)
      this.pending.set(id, (vector) => {
        clearTimeout(timer)
        resolve(vector)
      })
      this.send({ cmd: 'embed', id, wav, start, end })
    })
  }

  release(): void {
    this.process.stop()
    this.process.resetCrashes()
    this.gaveUp = false
    this.reset()
  }

  /** `true` cuando el modelo está cargado en el sidecar. */
  private load(): Promise<boolean> {
    this.loading ??= this.startLoad()
    return this.loading
  }

  private async startLoad(): Promise<boolean> {
    const model = await this.model.readyPath()
    if (!model) {
      // Se vuelve a mirar en la próxima huella, cuando quizá ya terminó.
      this.loading = null
      void this.model.prepare()
      return false
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.finishLoad(false), LOAD_TIMEOUT_MS)
      this.settleLoad = (ok) => {
        clearTimeout(timer)
        resolve(ok)
      }
      this.send({ cmd: 'load', model, threads: EMBED_THREADS })
    })
  }

  private send(command: SpeakerCommand): void {
    this.process.send(command)
  }

  private finishLoad(ok: boolean): void {
    this.settleLoad?.(ok)
    this.settleLoad = null
  }

  private settle(id: number, vector: number[] | null): void {
    this.pending.get(id)?.(vector)
    this.pending.delete(id)
  }

  /** El proceso ya no tiene el modelo: lo pendiente queda sin huella y se vuelve a cargar. */
  private reset(): void {
    this.finishLoad(false)
    this.loading = null
    for (const id of [...this.pending.keys()]) this.settle(id, null)
  }

  private handleLine(line: string): void {
    const event = parseSpeakerEvent(line)
    if (!event) return this.log.warn(`Hablantes: línea no válida del sidecar: ${line}`)
    this.handleEvent(event)
  }

  private handleEvent(event: SpeakerEvent): void {
    switch (event.type) {
      case 'loaded':
        this.log.info(`Hablantes: modelo de voces cargado (${event.dim} dimensiones)`)
        return this.finishLoad(true)
      case 'loadFailed':
        // Queda como fallido hasta `release`: no se reintenta con cada segmento.
        this.log.error(`Hablantes: no se pudo cargar el modelo de voces: ${event.message}`)
        return this.finishLoad(false)
      case 'embedding':
        return this.settle(event.id, event.vector)
      case 'embedFailed':
        return this.settle(event.id, null)
      case 'error':
        this.log.warn(`Hablantes: el sidecar avisa ${event.code}: ${event.message}`)
        return this.reset()
    }
  }
}
