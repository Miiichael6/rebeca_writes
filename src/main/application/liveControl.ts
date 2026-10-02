import { resolve } from 'path'
import type { LiveSessionInfo } from '@shared/types'
import type { LiveCommand } from '../domain/liveArgs'
import { LiveSession, type LiveDeps } from './liveSession'
import type { QueueIntake } from './queueIntake'
import type { OwnVoice } from './speakerLabeler'

function samePath(a: string, b: string): boolean {
  return resolve(a).toLowerCase() === resolve(b).toLowerCase()
}

/** Quién graba: Rebecca Listen (tarea 27) o el micrófono de la propia app (tarea 29). */
export type LiveOrigin = 'listen' | 'mic'

/** Un inicio rechazado porque el otro origen está grabando. */
export class LiveBusyError extends Error {
  constructor(readonly busyWith: LiveOrigin) {
    super(`Ya hay una grabación en vivo de ${busyWith}`)
    this.name = 'LiveBusyError'
  }
}

/**
 * Qué hacer con cada orden en vivo. Hay una sesión a la vez: si el mismo origen empieza otra
 * grabación, la anterior se cierra con lo que tenga; si la empieza el otro origen mientras se
 * graba, se rechaza (y el fin de Listen, sin sesión, manda su grabación a la cola).
 */
export class LiveControl {
  private session: LiveSession | null = null
  private origin: LiveOrigin = 'listen'
  /** Última orden en curso: cada orden espera a la anterior. */
  private last: Promise<void> = Promise.resolve()

  constructor(
    private readonly deps: LiveDeps,
    private readonly intake: Pick<QueueIntake, 'addPaths'>
  ) {}

  /**
   * Atiende las órdenes de una en una. Así un fin que llega mientras se crea la sesión, o un
   * segundo inicio, ven la sesión ya creada y no la dejan huérfana. `ownVoice`: cuándo habla
   * quien graba, si el origen lo sabe (tarea 35).
   */
  handle(
    command: LiveCommand,
    origin: LiveOrigin = 'listen',
    ownVoice: OwnVoice | null = null
  ): Promise<void> {
    const run = this.last.then(() => this.apply(command, origin, ownVoice))
    this.last = run.catch(() => {})
    return run
  }

  private async apply(
    command: LiveCommand,
    origin: LiveOrigin,
    ownVoice: OwnVoice | null
  ): Promise<void> {
    if (command.kind === 'start') {
      if (this.session && samePath(this.session.pcm, command.pcm)) return
      if (this.session?.recording && origin !== this.origin) {
        this.deps.log.warn(`En vivo: se rechaza el inicio de ${origin}; graba ${this.origin}`)
        throw new LiveBusyError(this.origin)
      }
      this.session?.end(null)
      this.session = await LiveSession.start(
        this.deps,
        command.pcm,
        command.name,
        (finished) => this.forget(finished),
        ownVoice
      )
      this.origin = origin
      return
    }
    if (this.session && samePath(this.session.pcm, command.pcm)) {
      this.session.end(command.media)
      return
    }
    // No se vio el inicio (p. ej. falló al abrirse): la grabación se transcribe como un archivo más.
    this.deps.log.info(`En vivo: fin sin sesión para ${command.pcm}; la grabación va a la cola`)
    if (command.media) await this.intake.addPaths([command.media])
    await this.deps.files.remove(command.pcm)
  }

  /** `live:current`: la sesión en curso, para la ventana que carga después de que empezara. */
  current(): LiveSessionInfo | null {
    return this.session?.info() ?? null
  }

  /** Quién está grabando ahora mismo, o `null` si nadie (la sesión ya pudo recibir el fin). */
  recordingOrigin(): LiveOrigin | null {
    return this.session?.recording ? this.origin : null
  }

  /** "Cancelar" con la entrada en vivo abierta. `false` si `jobId` no es la sesión en vivo. */
  cancel(jobId: string): boolean {
    if (this.session?.jobId !== jobId) return false
    this.session.cancel()
    return true
  }

  /** Al cerrar la app: la entrada queda con lo transcrito (ver `restoreEntry`). */
  stop(): void {
    this.deps.chunks.cancelAll()
  }

  private forget(finished: LiveSession): void {
    if (this.session === finished) this.session = null
  }
}
