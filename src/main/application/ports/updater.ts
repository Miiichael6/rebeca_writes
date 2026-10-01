export interface UpdateAvailable {
  version: string
  releaseNotes?: string
  sizeBytes: number
}

export interface UpdateProgress {
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface UpdaterEvents {
  checking: () => void
  available: (info: UpdateAvailable) => void
  notAvailable: () => void
  progress: (progress: UpdateProgress) => void
  downloaded: (version: string) => void
  error: (error: unknown) => void
}

/** Puerto de salida: el servicio de actualizaciones del instalador (Releases de GitHub). */
export interface Updater {
  /** ¿Hay de dónde actualizar? (app empaquetada o `dev-app-update.yml`). */
  readonly available: boolean
  on<K extends keyof UpdaterEvents>(event: K, listener: UpdaterEvents[K]): void
  /** Los fallos llegan por el evento `error`. */
  check(): Promise<void>
  download(): Promise<void>
  /** Cierra e instala en silencio y reabre la app. */
  quitAndInstall(): void
}
