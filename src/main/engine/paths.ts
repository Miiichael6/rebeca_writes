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

export function whisperCliPath(backend: Backend, root = binRoot()): string {
  return join(root, backend, 'whisper-cli.exe')
}

/** Backends con whisper-cli instalado, en orden de preferencia. */
export function installedBackends(root = binRoot()): Backend[] {
  return BACKEND_ORDER.filter((b) => existsSync(whisperCliPath(b, root)))
}

/** Ruta de whisper-cli para el backend; falla si el exe no existe (falta `npm run fetch:bin`). */
export function getWhisperCli(backend: Backend, root = binRoot()): string {
  const path = whisperCliPath(backend, root)
  if (!existsSync(path)) throw new BackendNotInstalledError(backend)
  return path
}
