import type { Backend } from '@shared/types'

/**
 * Reglas de la autodetección sin Electron, para probarlas con Vitest. La detección real
 * (nvidia-smi, `whisper-cli --help`) está en `backend.ts`.
 */

/** Lo que quedó guardado en settings de la última detección. */
export interface SavedDetection {
  detectedBackend: Backend | null
  installedBackends: readonly Backend[]
}

function sameBackends(a: readonly Backend[], b: readonly Backend[]): boolean {
  return a.length === b.length && a.every((backend) => b.includes(backend))
}

/**
 * Hay que detectar si nunca se hizo o si cambiaron los backends instalados desde entonces:
 * se descargó o se quitó CUDA, o una actualización trajo otro. Antes solo se repetía cuando
 * el detectado desaparecía, así que un CUDA instalado después nunca se llegaba a usar.
 */
export function needsDetection(saved: SavedDetection, installed: readonly Backend[]): boolean {
  return (
    !saved.detectedBackend ||
    !installed.includes(saved.detectedBackend) ||
    !sameBackends(saved.installedBackends, installed)
  )
}

/**
 * Backend elegido tras una nueva detección. Si coincidía con el detectado anterior se toma
 * como "automático" y sigue al nuevo; si el usuario había elegido otro, se respeta.
 */
export function followDetected(
  chosen: Backend | null,
  previousDetected: Backend | null,
  detected: Backend
): Backend {
  return !chosen || chosen === previousDetected ? detected : chosen
}

/** Se ofrece descargar CUDA cuando hay GPU NVIDIA y CUDA no está instalado. */
export function isCudaDownloadable(nvidia: boolean, installed: readonly Backend[]): boolean {
  return nvidia && !installed.includes('cuda')
}
