import type { ErrorCode } from '@shared/types'
import { BackendNotInstalledError } from './fallback'
import { MediaError } from './media'

/** Errores del propio motor (fuera de los que ya da `probe`/`toWav`). */
export class TranscribeError extends Error {
  constructor(
    readonly code: Extract<
      ErrorCode,
      'modelMissing' | 'backendFailed' | 'noDiskSpace' | 'cancelled'
    >,
    readonly detail = ''
  ) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'TranscribeError'
  }
}

/** Traduce cualquier fallo del pipeline al código que ve el usuario. */
export function toErrorCode(err: unknown): { code: ErrorCode; detail: string } {
  if (err instanceof TranscribeError) return { code: err.code, detail: err.detail }
  if (err instanceof MediaError) return { code: err.code, detail: err.detail }
  if (err instanceof BackendNotInstalledError) return { code: 'backendFailed', detail: err.message }
  if (err instanceof Error && err.name === 'AbortError') return { code: 'cancelled', detail: '' }
  if (err && typeof err === 'object' && (err as NodeJS.ErrnoException).code === 'ENOSPC') {
    return { code: 'noDiskSpace', detail: '' }
  }
  return { code: 'unknown', detail: err instanceof Error ? err.message : String(err) }
}
