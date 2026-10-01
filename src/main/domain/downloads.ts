/** Errores y nombres de archivo de las descargas (modelos, paquete CUDA, tarea 06 y 23.1). */

export class DownloadError extends Error {
  constructor(
    readonly code: 'downloadFailed' | 'sizeMismatch',
    message: string
  ) {
    super(message)
    this.name = 'DownloadError'
  }
}

export class CudaInstallError extends Error {
  constructor(
    /** `sizeMismatch`: el zip está dañado. `cudaInvalid`: no trae whisper-cli o no arranca. */
    readonly code: 'sizeMismatch' | 'cudaInvalid',
    message: string
  ) {
    super(message)
    this.name = 'CudaInstallError'
  }
}

/** Archivo parcial de una descarga; se renombra a `dest` al terminar. */
export function partPath(dest: string): string {
  return `${dest}.part`
}
