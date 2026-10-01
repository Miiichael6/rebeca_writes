import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import type { Logger } from '../../application/ports/eventPublisher'
import { LineReader } from '../../domain/capture/sidecarProtocol'

/** Espera antes de volver a arrancarlo si se cae. */
const RESTART_DELAY_MS = 1000
/** Caídas seguidas antes de rendirse. */
const MAX_RESTARTS = 3
/** Si vivió al menos esto, la caída no cuenta como seguida. */
const STABLE_MS = 60_000

export interface RestartingSidecarHooks {
  /** Una línea de stderr (los eventos JSON). */
  line: (line: string) => void
  /**
   * Pasó la espera tras una caída: quien lo usa decide si lo vuelve a arrancar (con `send` o
   * `ensureRunning`) y le repite lo que necesite.
   */
  retry: () => void
  /** Se cayó demasiadas veces seguidas: ya no se pide `retry`. */
  gaveUp?: () => void
}

/**
 * Un sidecar que vive mientras la app lo necesita (`rl-hotkey`, `rl-calls`): lo arranca al
 * usarlo, lee sus eventos de stderr línea a línea y, si se cae, pide reintentar con un límite
 * de caídas seguidas. Cerrar stdin lo termina.
 */
export class RestartingSidecar {
  private child: ChildProcessWithoutNullStreams | null = null
  private startedAt = 0
  private crashes = 0
  private restart: ReturnType<typeof setTimeout> | null = null

  /** `name` encabeza sus líneas en el log ("Atajo", "Reuniones"). */
  constructor(
    private readonly binaryPath: string,
    private readonly name: string,
    private readonly hooks: RestartingSidecarHooks,
    private readonly log: Logger
  ) {}

  isRunning(): boolean {
    return this.child !== null
  }

  /** Lo arranca si no está vivo. */
  ensureRunning(): ChildProcessWithoutNullStreams {
    return this.child ?? this.start()
  }

  /** Lo arranca si no está vivo y le manda `command` como una línea JSON por stdin. */
  send(command: unknown): void {
    this.ensureRunning().stdin.write(`${JSON.stringify(command)}\n`)
  }

  /** Las caídas vuelven a contar desde cero (p. ej. al cambiar lo que se vigila). */
  resetCrashes(): void {
    this.crashes = 0
  }

  /** Cierra stdin (el sidecar termina solo) y anula el reintento pendiente. */
  stop(): void {
    if (this.restart) clearTimeout(this.restart)
    this.restart = null
    this.child?.stdin.end()
    this.child = null
  }

  private start(): ChildProcessWithoutNullStreams {
    const child = spawn(this.binaryPath, [], { windowsHide: true })
    this.startedAt = Date.now()
    this.log.info(`${this.name}: sidecar arrancado (${this.binaryPath})`)

    const lines = new LineReader(this.hooks.line)
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => lines.push(chunk))
    child.on('error', (error) => this.handleEnd(child, error.message))
    child.on('exit', (code) => this.handleEnd(child, `código de salida ${code}`))
    child.stdin.on('error', (error) => this.handleEnd(child, error.message))

    this.child = child
    return child
  }

  private handleEnd(child: ChildProcessWithoutNullStreams, reason: string): void {
    // `error` y `exit` pueden llegar los dos para el mismo proceso; tras `stop` ya no es este.
    if (this.child !== child) return
    this.child = null
    this.log.warn(`${this.name}: el sidecar terminó (${reason})`)
    this.crashes = Date.now() - this.startedAt >= STABLE_MS ? 1 : this.crashes + 1
    if (this.crashes > MAX_RESTARTS) {
      this.log.error(`${this.name}: el sidecar se cayó ${MAX_RESTARTS + 1} veces seguidas`)
      return this.hooks.gaveUp?.()
    }
    this.restart = setTimeout(() => {
      this.restart = null
      this.hooks.retry()
    }, RESTART_DELAY_MS)
  }
}
