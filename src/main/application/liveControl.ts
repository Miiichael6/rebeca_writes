import { resolve } from 'path'
import type { LiveSessionInfo } from '@shared/types'
import type { LiveCommand } from '../domain/liveArgs'
import { LiveSession, type LiveDeps } from './liveSession'
import type { QueueIntake } from './queueIntake'

function samePath(a: string, b: string): boolean {
  return resolve(a).toLowerCase() === resolve(b).toLowerCase()
}

/**
 * Qué hacer con cada orden de Rebecca Listen (tarea 27). Hay una sesión en vivo a la vez: si
 * empieza otra grabación, la anterior se cierra con lo que tenga.
 */
export class LiveControl {
  private session: LiveSession | null = null
  /** Última orden en curso: cada orden espera a la anterior. */
  private last: Promise<void> = Promise.resolve()

  constructor(
    private readonly deps: LiveDeps,
    private readonly intake: Pick<QueueIntake, 'addPaths'>
  ) {}

  /**
   * Atiende las órdenes de una en una. Así un fin que llega mientras se crea la sesión, o un
   * segundo inicio, ven la sesión ya creada y no la dejan huérfana.
   */
  handle(command: LiveCommand): Promise<void> {
    const run = this.last.then(() => this.apply(command))
    this.last = run.catch(() => {})
    return run
  }

  private async apply(command: LiveCommand): Promise<void> {
    if (command.kind === 'start') {
      if (this.session && samePath(this.session.pcm, command.pcm)) return
      this.session?.end(null)
      this.session = await LiveSession.start(this.deps, command.pcm, command.name, (finished) =>
        this.forget(finished)
      )
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
