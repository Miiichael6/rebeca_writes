import type { UpdateErrorCode, UpdateInstallBlocker } from '@shared/types'

/** Lógica pura del actualizador, sin Electron, para poder probarla. */

/** Como mucho una comprobación automática cada 6 h. */
export const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface AutoCheckInput {
  packaged: boolean
  autoCheck: boolean
  /** Última comprobación de esta sesión; `null` si aún no hubo ninguna. */
  lastCheckAt: number | null
  now: number
}

/** La comprobación al iniciar solo corre en la app empaquetada y con el ajuste activo. */
export function shouldAutoCheck({
  packaged,
  autoCheck,
  lastCheckAt,
  now
}: AutoCheckInput): boolean {
  if (!packaged || !autoCheck) return false
  return lastCheckAt === null || now - lastCheckAt >= AUTO_CHECK_INTERVAL_MS
}

/** No se reinicia en medio de una transcripción (o de la cola) ni de la descarga de CUDA. */
export function installBlocker(state: {
  transcribing: boolean
  cudaJob: boolean
}): UpdateInstallBlocker | null {
  if (state.transcribing) return 'transcribing'
  if (state.cudaJob) return 'cudaDownload'
  return null
}

const OFFLINE_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH'])

/** Traduce el error de `electron-updater` a un código; `phase` decide el genérico. */
export function updateErrorCode(err: unknown, phase: 'check' | 'download'): UpdateErrorCode {
  const code = (err as { code?: unknown } | null)?.code
  const message = err instanceof Error ? err.message : String(err ?? '')
  if (code === 'ENOSPC') return 'noDiskSpace'
  if (
    (typeof code === 'string' && OFFLINE_CODES.has(code)) ||
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/.test(
      message
    )
  ) {
    return 'offline'
  }
  if (/ENOSPC/.test(message)) return 'noDiskSpace'
  return phase === 'check' ? 'checkFailed' : 'downloadFailed'
}
