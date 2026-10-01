/** Puerto de salida: el disco de la sesión en vivo (el `.pcm` que crece y los WAV de las ventanas). */
export interface LivePcmFiles {
  /** Tamaño del `.pcm`, o `null` si ya no existe. */
  size(pcm: string): Promise<number | null>
  /** Lee hasta `length` bytes desde `position`, siempre un número entero de muestras. */
  read(pcm: string, position: number, length: number): Promise<Buffer>
  /** Guarda una ventana de PCM como WAV en la carpeta temporal del trabajo y devuelve su ruta. */
  writeWindow(jobId: string, windowId: string, pcm: Uint8Array): Promise<string>
  remove(path: string): Promise<void>
  /** Al terminar: borra el `.pcm` y la carpeta temporal del trabajo. */
  cleanup(jobId: string, pcm: string): Promise<void>
}
