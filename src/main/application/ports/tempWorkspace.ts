/** Puerto de salida: la carpeta temporal de cada trabajo (WAV de ffmpeg, ventanas en vivo). */
export interface TempWorkspace {
  dir(jobId: string): string
  /** Borra la carpeta del trabajo; no falla si no existe. */
  remove(jobId: string): Promise<void>
}
