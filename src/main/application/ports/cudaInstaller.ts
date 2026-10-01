export interface CudaInstallRequest {
  zip: string
  /** Carpeta final del paquete (`userData/backends/cuda`). */
  target: string
  sha256: string
  /** Carpeta de donde copiar el runtime de Visual C++. */
  vcRuntimeDir: string
  /** Comprueba que el whisper-cli armado arranca y ve la GPU. */
  validate: (cliPath: string) => Promise<boolean>
}

/** Puerto de salida: verifica, extrae y valida el zip de CUDA. Falla con `CudaInstallError`. */
export interface CudaInstaller {
  install(request: CudaInstallRequest): Promise<void>
}
