import { existsSync } from 'fs'
import { join } from 'path'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { BackendNotInstalledError } from '../../domain/fallback'

/**
 * Dónde están los whisper-cli: `<raíz>/<backend>/whisper-cli.exe`. Las raíces van en orden de
 * preferencia: lo que trae la app (`resources/bin`, fuera del asar) y después lo descargado
 * desde la app (`userData/backends`, tarea 23.1).
 */

/** whisper-cli del backend en la primera raíz que lo tenga (o en la primera, si no está en ninguna). */
export function whisperCliPath(backend: Backend, roots: readonly string[]): string {
  const paths = roots.map((root) => join(root, backend, 'whisper-cli.exe'))
  return paths.find((path) => existsSync(path)) ?? paths[0]
}

/** Backends con whisper-cli instalado en alguna raíz, en orden de preferencia. */
export function installedBackends(roots: readonly string[]): Backend[] {
  return BACKEND_ORDER.filter((b) => existsSync(whisperCliPath(b, roots)))
}

/** Ruta de whisper-cli para el backend; falla si el exe no existe (falta `npm run fetch:bin`). */
export function getWhisperCli(backend: Backend, roots: readonly string[]): string {
  const path = whisperCliPath(backend, roots)
  if (!existsSync(path)) throw new BackendNotInstalledError(backend)
  return path
}
