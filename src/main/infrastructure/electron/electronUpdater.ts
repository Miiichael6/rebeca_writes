import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log/main'
import type { Updater, UpdaterEvents } from '../../application/ports/updater'
import { installerSize, releaseNotesText } from '../../domain/updateInfo'

/** Con `dev-app-update.yml` junto al proyecto se puede probar el flujo sin empaquetar. */
const devConfigPath = (): string => join(app.getAppPath(), 'dev-app-update.yml')

/**
 * Adaptador de `Updater` sobre electron-updater. `autoUpdater` solo se toca si hay de dónde
 * actualizar: en desarrollo no hay `app-update.yml` y crearlo daría error.
 */
export function createElectronUpdater(): Updater {
  const available = app.isPackaged || existsSync(devConfigPath())
  let configured = false
  const listeners: (() => void)[] = []

  /** Los oyentes previos se enganchan al configurar, para no crear `autoUpdater` antes de tiempo. */
  function configure(): void {
    if (configured) return
    configured = true
    autoUpdater.autoDownload = false
    // Si se descargó y el usuario no reinició, se instala al cerrar.
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = log
    if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true
    for (const attach of listeners) attach()
  }

  return {
    available,

    on<K extends keyof UpdaterEvents>(event: K, listener: UpdaterEvents[K]): void {
      const attach: Record<keyof UpdaterEvents, () => void> = {
        checking: () =>
          autoUpdater.on('checking-for-update', listener as UpdaterEvents['checking']),
        available: () =>
          autoUpdater.on('update-available', (info) =>
            (listener as UpdaterEvents['available'])({
              version: info.version,
              releaseNotes: releaseNotesText(info.releaseNotes),
              sizeBytes: installerSize(info.files)
            })
          ),
        notAvailable: () =>
          autoUpdater.on('update-not-available', listener as UpdaterEvents['notAvailable']),
        progress: () =>
          autoUpdater.on('download-progress', (p) =>
            (listener as UpdaterEvents['progress'])({
              transferred: p.transferred,
              total: p.total,
              bytesPerSecond: p.bytesPerSecond
            })
          ),
        downloaded: () =>
          autoUpdater.on('update-downloaded', (info) =>
            (listener as UpdaterEvents['downloaded'])(info.version)
          ),
        error: () => autoUpdater.on('error', listener as UpdaterEvents['error'])
      }
      // Ya configurado: `autoUpdater` existe y el oyente se engancha en el acto.
      if (configured) attach[event]()
      else listeners.push(attach[event])
    },

    async check() {
      configure()
      await autoUpdater.checkForUpdates()
    },

    async download() {
      configure()
      await autoUpdater.downloadUpdate()
    },

    quitAndInstall() {
      autoUpdater.quitAndInstall(true, true)
    }
  }
}
