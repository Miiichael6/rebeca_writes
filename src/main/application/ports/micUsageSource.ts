/**
 * Puerto de salida: qué apps tienen el micrófono abierto (en Windows, el registro de privacidad
 * que vigila `rl-calls.exe`, tarea 32).
 */
export interface MicUsageSource {
  /**
   * Empieza a vigilar; `changed` recibe las claves del registro de esas apps al empezar y cada
   * vez que cambian.
   */
  start(changed: (apps: string[]) => void): void
  /** Deja de vigilar (al apagar el ajuste o al cerrar la app). */
  stop(): void
}
