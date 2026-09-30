import type { Backend, BackendInfo, CudaPackageStatus } from '@shared/types'

/**
 * Lo mismo que decide el main al transcribir: el elegido si está instalado, si no el detectado.
 * Mientras no llega la información, lo que haya elegido.
 */
export function activeBackend(
  chosen: Backend | null,
  info: Pick<BackendInfo, 'installed' | 'detected'> | null
): Backend | null {
  if (!info) return chosen
  return chosen && info.installed.includes(chosen) ? chosen : info.detected
}

export interface BackendOptionState {
  installed: boolean
  detected: boolean
  /** No está instalado, pero se puede descargar (solo CUDA). */
  downloadable: boolean
}

/** Estado de un radio de la lista de backends. Sin información, todos cuentan como instalados. */
export function backendOptionState(backend: Backend, info: BackendInfo | null): BackendOptionState {
  return {
    installed: info ? info.installed.includes(backend) : true,
    detected: info?.detected === backend,
    downloadable: backend === 'cuda' && Boolean(info?.cudaDownloadable)
  }
}

/** Qué texto de descripción lleva la tarjeta de CUDA; los números los formatea quien pinta. */
export type CudaDescription =
  | { kind: 'ready' }
  | { kind: 'installing' }
  | { kind: 'partial'; received: number; total: number }
  | { kind: 'available'; size: number }

export interface CudaCard {
  description: CudaDescription
  downloading: boolean
  /** Botón de descargar o de reanudar (`resume`). */
  showDownload: boolean
  resume: boolean
  showCancel: boolean
  showDelete: boolean
}

/**
 * Tarjeta de aceleración NVIDIA: con GPU NVIDIA y sin CUDA ofrece descargar el paquete; si ya
 * está, permite quitarlo. Devuelve `null` (no se muestra) sin NVIDIA ni nada que quitar.
 */
export function cudaCard(
  info: Pick<BackendInfo, 'cudaDownloadable'> | null,
  cuda: CudaPackageStatus | null
): CudaCard | null {
  if (!info || !cuda) return null
  const busy = cuda.state === 'downloading' || cuda.state === 'installing'
  if (!info.cudaDownloadable && !cuda.removable && !busy) return null

  const partial = cuda.state === 'missing' && cuda.partBytes > 0
  let description: CudaDescription
  if (cuda.state === 'installed') description = { kind: 'ready' }
  else if (cuda.state === 'installing') description = { kind: 'installing' }
  else if (partial) {
    description = { kind: 'partial', received: cuda.partBytes, total: cuda.sizeBytes }
  } else description = { kind: 'available', size: cuda.sizeBytes }

  return {
    description,
    downloading: cuda.state === 'downloading',
    showDownload: cuda.state === 'missing',
    resume: partial,
    showCancel: cuda.state === 'downloading',
    showDelete: cuda.removable || partial
  }
}
