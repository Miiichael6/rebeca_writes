/** Puerto de salida: ffmpeg para recortar y para la forma de onda (tarea 39). */
export interface Clipper {
  /** Ejecuta ffmpeg con `args`. Si falla, borra `out` para no dejar un archivo a medias. */
  run(args: string[], out: string): Promise<void>
  /** Picos de 0 a 1 de la primera pista de audio, en `bars` barras a lo largo de `durationSec`. */
  waveform(input: string, durationSec: number, bars: number): Promise<number[]>
}
