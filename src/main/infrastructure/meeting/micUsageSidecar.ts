import type { Logger } from '../../application/ports/eventPublisher'
import type { MicUsageSource } from '../../application/ports/micUsageSource'
import { parseMicUsageEvent } from '../../domain/meeting/micUsageProtocol'
import { RestartingSidecar } from '../sidecar/restartingSidecar'

/** El sidecar en `resources/bin` (lo deja ahí `npm run build:native`). */
export const CALLS_BINARY = 'rl-calls.exe'

/**
 * Adaptador de `MicUsageSource` sobre `rl-calls.exe` (tarea 32). Vive mientras se vigila; si se
 * cae lo vuelve a arrancar.
 */
export class MicUsageSidecar implements MicUsageSource {
  private readonly process: RestartingSidecar
  private changed: ((apps: string[]) => void) | null = null

  constructor(
    binaryPath: string,
    private readonly log: Logger
  ) {
    this.process = new RestartingSidecar(
      binaryPath,
      'Reuniones',
      {
        line: (line) => this.handleLine(line),
        retry: () => {
          if (this.changed) this.process.ensureRunning()
        }
      },
      log
    )
  }

  start(changed: (apps: string[]) => void): void {
    this.changed = changed
    this.process.resetCrashes()
    this.process.ensureRunning()
  }

  stop(): void {
    this.changed = null
    this.process.stop()
  }

  private handleLine(line: string): void {
    const event = parseMicUsageEvent(line)
    if (!event) return this.log.warn(`Reuniones: línea no válida del sidecar: ${line}`)
    if (event.type === 'error')
      return this.log.warn(`Reuniones: el sidecar avisa ${event.code}: ${event.message}`)
    this.changed?.(event.apps)
  }
}
