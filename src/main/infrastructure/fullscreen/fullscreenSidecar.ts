import type { Logger } from '../../application/ports/eventPublisher'
import type { FullscreenSource } from '../../application/ports/fullscreenSource'
import { parseFullscreenEvent } from '../../domain/dock/fullscreenProtocol'
import { RestartingSidecar } from '../sidecar/restartingSidecar'

/** El sidecar en `resources/bin` (lo deja ahí `npm run build:native`). */
export const FULLSCREEN_BINARY = 'rl-fullscreen.exe'

/**
 * Adaptador de `FullscreenSource` sobre `rl-fullscreen.exe` (tarea 40). Vive mientras se vigila;
 * si se cae lo vuelve a arrancar.
 */
export class FullscreenSidecar implements FullscreenSource {
  private readonly process: RestartingSidecar
  private changed: ((active: boolean) => void) | null = null

  constructor(
    binaryPath: string,
    private readonly log: Logger
  ) {
    this.process = new RestartingSidecar(
      binaryPath,
      'Pantalla completa',
      {
        line: (line) => this.handleLine(line),
        retry: () => {
          if (this.changed) this.process.ensureRunning()
        },
        // Sin sidecar no se sabe: mejor el dock a la vista que escondido para siempre.
        gaveUp: () => this.changed?.(false)
      },
      log
    )
  }

  start(changed: (active: boolean) => void): void {
    this.changed = changed
    this.process.resetCrashes()
    this.process.ensureRunning()
  }

  stop(): void {
    this.changed = null
    this.process.stop()
  }

  private handleLine(line: string): void {
    const event = parseFullscreenEvent(line)
    if (!event) return this.log.warn(`Pantalla completa: línea no válida del sidecar: ${line}`)
    this.changed?.(event.active)
  }
}
