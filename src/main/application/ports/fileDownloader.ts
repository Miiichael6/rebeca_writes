export interface DownloadProgress {
  received: number
  total: number
  bytesPerSec: number
  etaSec: number | null
}

export interface DownloadRequest {
  url: string
  /** Ruta final; se descarga en `<dest>.part` y se renombra al terminar. */
  dest: string
  expectedSize: number
  signal: AbortSignal
  onProgress: (progress: DownloadProgress) => void
}

/** Puerto de salida: descarga con reanudación. Falla con `DownloadError`. */
export interface FileDownloader {
  download(request: DownloadRequest): Promise<void>
}
