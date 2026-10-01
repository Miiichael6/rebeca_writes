/** Puerto de salida: avisos del proceso principal a la interfaz (en Electron, a las ventanas). */
export interface EventPublisher {
  publish(channel: string, payload: unknown): void
}

/** Lo que los casos de uso necesitan de un logger (`electron-log` lo cumple tal cual). */
export interface Logger {
  info(...params: unknown[]): void
  warn(...params: unknown[]): void
  error(...params: unknown[]): void
}
