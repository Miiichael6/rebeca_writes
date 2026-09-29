import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { BackendNotInstalledError } from './fallback'

/**
 * Carpeta `resources/bin`. En producción los binarios quedan fuera del asar
 * (`asarUnpack: resources/**`), así que se ejecutan desde `app.asar.unpacked`.
 */
export function binRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin')
    : join(app.getAppPath(), 'resources', 'bin')
}

/** Backends descargados desde la app (CUDA, tarea 23.1): `userData/backends/<backend>`. */
export function downloadedBinRoot(): string {
  return join(app.getPath('userData'), 'backends')
}

/** Dónde se busca whisper-cli, en orden: lo que trae la app y después lo descargado. */
export function binRoots(): string[] {
  return [binRoot(), downloadedBinRoot()]
}

/** whisper-cli del backend en la primera raíz que lo tenga (o en la primera, si no está en ninguna). */
export function whisperCliPath(backend: Backend, roots: readonly string[] = binRoots()): string {
  const paths = roots.map((root) => join(root, backend, 'whisper-cli.exe'))
  return paths.find((path) => existsSync(path)) ?? paths[0]
}

/** Backends con whisper-cli instalado en alguna raíz, en orden de preferencia. */
export function installedBackends(roots: readonly string[] = binRoots()): Backend[] {
  return BACKEND_ORDER.filter((b) => existsSync(whisperCliPath(b, roots)))
}

/** Ruta de whisper-cli para el backend; falla si el exe no existe (falta `npm run fetch:bin`). */
export function getWhisperCli(backend: Backend, roots: readonly string[] = binRoots()): string {
  const path = whisperCliPath(backend, roots)
  if (!existsSync(path)) throw new BackendNotInstalledError(backend)
  return path
}
