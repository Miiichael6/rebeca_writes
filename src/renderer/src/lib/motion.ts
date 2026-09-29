/**
 * Duraciones del movimiento, en milisegundos. Son las mismas que los tokens `--duration-*`
 * de `styles/tokens.css`: el CSS anima y el JS decide cuándo desmontar, así que los dos
 * números tienen que coincidir.
 */
export const MOTION_FAST = 83
export const MOTION = 167
export const MOTION_SLOW = 250

/**
 * `true` cuando el sistema pide menos movimiento. Se consulta en el momento (y no una vez al
 * arrancar) porque el usuario puede cambiar el ajuste con la app abierta.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Duración real de una animación: 0 ms si el sistema pide menos movimiento. */
export function motionDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration
}
