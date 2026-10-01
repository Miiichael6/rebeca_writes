import type { UpdateStatus } from '@shared/types'

type ErrorCode = Extract<UpdateStatus, { state: 'error' }>['code']

/** Clave de i18n (bajo `errors.`) de cada error del actualizador. */
export const UPDATE_ERROR_KEYS = {
  offline: 'offline',
  checkFailed: 'checkFailed',
  downloadFailed: 'updateDownloadFailed',
  noDiskSpace: 'noDiskSpace'
} as const satisfies Record<ErrorCode, string>

/** Buscando o descargando: no se puede lanzar otra búsqueda. */
export function isBusy(status: UpdateStatus): boolean {
  return status.state === 'checking' || status.state === 'downloading'
}
