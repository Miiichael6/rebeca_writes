import { join } from 'path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { APP_ID, APP_NAME } from '@shared/app'
import { IpcChannel } from '@shared/ipc'
import { createServices } from './composition'
import { setupLogging } from './infrastructure/electron/logging'
import { MainWindow } from './infrastructure/electron/mainWindow'
import { handleMediaProtocol, registerMediaScheme } from './infrastructure/electron/mediaProtocol'
import { watchNativeTheme } from './infrastructure/electron/theme'
import { flushAllWrites, hasPendingWrites } from './infrastructure/persistence/fsAtomic'
import { registerIpcHandlers } from './ipc'

app.setName(APP_NAME)
// Instancia única (spec §6): una segunda instancia le pasa su argv a esta y se cierra. Va
// después de `setName` porque el lock vive en la carpeta `userData`, que sale del nombre.
const primary = app.requestSingleInstanceLock()
if (!primary) app.quit()
setupLogging()
registerMediaScheme()

const services = createServices(
  {
    userData: app.getPath('userData'),
    // En producción los binarios quedan fuera del asar (`asarUnpack: resources/**`).
    bundledBinDir: app.isPackaged
      ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin')
      : join(app.getAppPath(), 'resources', 'bin'),
    tempDir: join(app.getPath('temp'), APP_NAME.toLowerCase()),
    appPath: app.getAppPath(),
    packaged: app.isPackaged,
    defaultRecordingsDir: join(app.getPath('documents'), APP_NAME, 'Grabaciones')
  },
  {
    showMainWindow: () => mainWindow.show(),
    quit: () => app.quit()
  }
)
const { settings, registry, queue, backends, previews, manager, live, mic, updates, dock } =
  services
const { dockMenu } = services
const mainWindow = new MainWindow(settings, log)

app.on('second-instance', (_event, argv, workingDirectory) => {
  mainWindow.show()
  void services.queueFromArgv(argv, workingDirectory).then((result) => {
    if (result) mainWindow.current()?.webContents.send(IpcChannel.QueueFilesReceived, result)
  })
})

app.whenReady().then(async () => {
  if (!primary) return
  electronApp.setAppUserModelId(APP_ID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Antes de la ventana: de aquí salen el tema y el tamaño con que se abre.
  const loaded = await settings.load().catch((err) => {
    log.error('No se pudo leer settings.json; se usan los valores por defecto', err)
    return null
  })
  if (loaded) nativeTheme.themeSource = loaded.theme
  // Cambiar themeSource dispara nativeTheme 'updated' → watchNativeTheme recolorea la ventana.
  settings.onChanged(({ theme }) => {
    if (nativeTheme.themeSource !== theme) nativeTheme.themeSource = theme
  })

  handleMediaProtocol((id) => registry.resolve(id))
  registerIpcHandlers(services)
  queue.init().catch((err) => log.error('No se pudo leer la cola', err))
  watchNativeTheme()
  // Autodetección del backend en segundo plano; la ventana no la espera.
  backends.info().catch((err) => log.error('No se pudo resolver el backend', err))

  mainWindow.create()
  dock.open()
  dockMenu.prepare()
  updates.scheduleAutoCheck()
  // Arranque en frío con archivos ("Abrir con"). Si la cola pregunta si retomar, esperan a
  // la respuesta y "Descartar" no los quita.
  void services.queueFromArgv(process.argv, process.cwd())

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) mainWindow.create()
  })
})

app.on('will-quit', () => {
  previews.dispose()
  manager.cancelAll()
  mic.dispose()
  live.stop()
})

/** Antes de cerrar: la grabación en curso se guarda (D9) y se escribe lo pendiente. */
async function finishBeforeQuit(): Promise<void> {
  if (mic.state().recording)
    await mic.stop().catch((err) => log.error('No se pudo guardar la grabación al salir', err))
  // Settings, historial y cola se guardan con debounce.
  if (hasPendingWrites())
    await flushAllWrites().catch((err) =>
      log.error('No se pudieron guardar los datos al salir', err)
    )
}

let readyToQuit = false
app.on('before-quit', (event) => {
  queue.shutdown()
  if (readyToQuit) return
  event.preventDefault()
  void finishBeforeQuit().finally(() => {
    readyToQuit = true
    dock.close()
    dockMenu.close()
    app.quit()
  })
})

// Cerrar la ventana deja la app en segundo plano con el dock (D9); se sale desde el dock.
app.on('window-all-closed', () => {})
