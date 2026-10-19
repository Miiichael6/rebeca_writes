import type { Dock } from './dock'
import type { Logger } from './ports/eventPublisher'
import type { FullscreenSource } from './ports/fullscreenSource'

export interface DockFullscreenDeps {
  source: FullscreenSource
  dock: Pick<Dock, 'setFullscreen'>
  log: Logger
}

/**
 * Esconder el dock con una app a pantalla completa (tarea 40): mientras un juego, un video o una
 * presentación ocupe el monitor principal, el dock no está ni en el borde. Solo vigila con el
 * ajuste `hideDockInFullscreen` encendido.
 */
export class DockFullscreen {
  private enabled = false

  constructor(private readonly deps: DockFullscreenDeps) {}

  /** Enciende o apaga la vigilancia. Al apagarla el dock vuelve aunque siga la pantalla completa. */
  configure(enabled: boolean): void {
    if (enabled === this.enabled) return
    this.enabled = enabled
    if (!enabled) {
      this.deps.source.stop()
      this.deps.dock.setFullscreen(false)
      return
    }
    this.deps.source.start((active) => {
      if (!this.enabled) return
      this.deps.log.info(`Pantalla completa: ${active ? 'sí, se esconde el dock' : 'no'}`)
      this.deps.dock.setFullscreen(active)
    })
  }

  /** Al cerrar la app: no queda `rl-fullscreen.exe` vivo. */
  dispose(): void {
    this.enabled = false
    this.deps.source.stop()
  }
}
