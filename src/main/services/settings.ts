import { availableParallelism } from 'os'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type { Settings, SettingsPatch } from '@shared/settings'
import { SettingsStore } from './settingsStore'

/** Puente entre `SettingsStore` y la app: ruta en `userData` y aviso al renderer de cada cambio. */

let store: SettingsStore | null = null

function getStore(): SettingsStore {
  if (store) return store
  store = new SettingsStore({
    path: join(app.getPath('userData'), 'settings.json'),
    cpuCount: availableParallelism(),
    onCorrupt: (backup, err) => log.error(`settings.json corrupto; respaldado en ${backup}`, err)
  })
  store.on('changed', (settings) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IpcChannel.SettingsChanged, settings)
    }
  })
  return store
}

/** Carga settings.json (una sola vez). Se espera al arrancar, antes de crear la ventana. */
export function loadSettings(): Promise<Settings> {
  return getStore().load()
}

/** Settings en memoria sin esperar; los valores por defecto si aún no se cargaron. */
export function getSettings(): Settings {
  return getStore().get()
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return getStore().update(patch)
}

/** Escucha los cambios en el main (p. ej. aplicar el tema). Devuelve la función para dejar de escuchar. */
export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const s = getStore()
  s.on('changed', listener)
  return () => s.off('changed', listener)
}
