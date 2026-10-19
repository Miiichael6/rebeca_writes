/**
 * Puerto de salida: si hay una app a pantalla completa en el monitor principal (un juego, un
 * video, una presentación). En Windows lo vigila `rl-fullscreen.exe` (tarea 40).
 */
export interface FullscreenSource {
  /** Empieza a vigilar; `changed` recibe el estado al empezar y cada vez que cambia. */
  start(changed: (active: boolean) => void): void
  /** Deja de vigilar (al apagar el ajuste o al cerrar la app). */
  stop(): void
}
