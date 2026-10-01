import type { Point } from './edge'

/** Fotogramas de un deslizamiento del dock. */
export const SLIDE_FRAMES = 14

/** Cada valor del deslizamiento de `from` a `to`, frenando al final y acabando en `to`. */
export function slidePath(from: number, to: number, frames: number): number[] {
  return Array.from({ length: frames }, (_, index) => {
    const t = (index + 1) / frames
    const eased = 1 - (1 - t) ** 3
    return Math.round(from + (to - from) * eased)
  })
}

/** Las posiciones del deslizamiento de `from` a `to` (arriba o abajo solo cambia y). */
export function slidePoints(from: Point, to: Point, frames = SLIDE_FRAMES): Point[] {
  const xs = slidePath(from.x, to.x, frames)
  const ys = slidePath(from.y, to.y, frames)
  return xs.map((x, index) => ({ x, y: ys[index] }))
}
