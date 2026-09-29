/**
 * Qué elementos de una lista que solo crece acaban de llegar, para animar su aparición.
 * Sin React ni relojes propios: quien llama pasa el `now`.
 */

export interface RecentWindow {
  /** Primer índice recién llegado. */
  from: number
  /** Primer índice que ya no entra (exclusivo). */
  to: number
  /** Momento a partir del cual la ventana deja de contar como reciente. */
  expires: number
}

export const NO_RECENT: RecentWindow = { from: 0, to: 0, expires: 0 }

/**
 * Amplía la ventana de recién llegados tras pasar de `prevCount` a `count` elementos.
 *
 * Una subida mayor que `maxBurst` no es transcripción en vivo sino una lista que se carga
 * entera (abrir un archivo ya transcrito): esa no se anima, porque animar miles de filas a la
 * vez ni se aprecia ni sale gratis.
 */
export function extendRecent(
  current: RecentWindow,
  prevCount: number,
  count: number,
  now: number,
  duration: number,
  maxBurst: number
): RecentWindow {
  if (count <= prevCount || count - prevCount > maxBurst) return NO_RECENT
  const open = now < current.expires
  return { from: open ? current.from : prevCount, to: count, expires: now + duration }
}

/** La caducidad no se mira aquí: quien use la ventana la descarta al vencer `expires`. */
export function isRecent(window: RecentWindow, index: number): boolean {
  return index >= window.from && index < window.to
}
