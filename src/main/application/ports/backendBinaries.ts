import type { Backend } from '@shared/types'

/** Puerto de salida: los `whisper-cli` instalados y las pruebas que se les hacen. */
export interface BackendBinaries {
  /** Backends con whisper-cli instalado, en orden de preferencia. */
  installed(): Backend[]
  /** Ruta de whisper-cli; falla con `BackendNotInstalledError` si no está instalado. */
  cliPath(backend: Backend): string
  /** `nvidia-smi -L` responde y lista al menos una GPU. */
  hasNvidiaGpu(): Promise<boolean>
  /** Arranca whisper-cli con `--help` y comprueba que carga y ve un dispositivo. */
  probe(backend: Backend, cliPath?: string): Promise<boolean>
}
