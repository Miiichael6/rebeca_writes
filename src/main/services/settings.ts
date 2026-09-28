import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

// Versión mínima de `userData/settings.json`: por ahora solo la usa la detección de backend.
// La tarea 12 la reemplaza con el tipo `Settings` completo, defaults y escritura con fsync.

export type StoredSettings = Record<string, unknown>

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<StoredSettings> {
  try {
    const data: unknown = JSON.parse(await readFile(settingsPath(), 'utf8'))
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as StoredSettings) : {}
  } catch {
    return {}
  }
}

/** Fusiona `patch` en settings.json con escritura atómica (temporal + rename). */
export async function updateSettings(patch: StoredSettings): Promise<void> {
  const next = { ...(await readSettings()), ...patch }
  const path = settingsPath()
  const tmp = `${path}.tmp`
  await writeFile(tmp, JSON.stringify(next, null, 2), 'utf8')
  await rename(tmp, path)
}
