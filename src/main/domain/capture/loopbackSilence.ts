/**
 * WASAPI en loopback no entrega nada mientras el equipo está en silencio (tarea 29, de
 * `silence.ts` de Rebecca Listen). Para que la grabación no se salte los silencios, esto calcula
 * por reloj cuántas muestras de silencio faltan delante de cada bloque o en cada tic sin datos.
 *
 * Solo rellena tras una pausa real en las entregas (`LOOPBACK_GAP_MS`), para que la pequeña
 * diferencia de reloj entre el dispositivo y el equipo nunca meta ceros en medio de audio
 * continuo.
 */

/** Pausa en las entregas a partir de la cual se considera que el equipo está en silencio. */
export const LOOPBACK_GAP_MS = 100
const MS_PER_S = 1000

export class LoopbackClock {
  /** Hora de reloj del último bloque (o del inicio, antes del primero). */
  private lastArrivalMs: number
  /** Muestras por canal entregadas hasta ahora, silencio incluido. */
  private framesWritten = 0

  constructor(
    private readonly sampleRate: number,
    private readonly startMs: number
  ) {
    this.lastArrivalMs = startMs
  }

  /** Llega un bloque de `frames` a `nowMs`: devuelve el silencio que va delante. */
  block(nowMs: number, frames: number): number {
    const silence = this.silenceBefore(nowMs, frames)
    this.framesWritten += silence + frames
    this.lastArrivalMs = nowMs
    return silence
  }

  /** Tic sin datos: el silencio que lleva la grabación hasta `nowMs`. */
  tick(nowMs: number): number {
    const silence = this.silenceBefore(nowMs, 0)
    this.framesWritten += silence
    return silence
  }

  private silenceBefore(nowMs: number, incomingFrames: number): number {
    if (nowMs - this.lastArrivalMs < LOOPBACK_GAP_MS) return 0
    const expected = Math.round(((nowMs - this.startMs) / MS_PER_S) * this.sampleRate)
    return Math.max(0, expected - this.framesWritten - incomingFrames)
  }
}
