import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { APP_ID, APP_NAME } from '@shared/app'
import log from 'electron-log/main'
import { registerIpcHandlers } from './ipc'
import { getBackendInfo } from './engine/backend'
import { resolvedTheme, titleBarOverlay, watchNativeTheme } from './theme'
import { WINDOW_COLORS } from '@shared/theme'

app.setName(APP_NAME)

function createWindow(): void {
  const theme = resolvedTheme()

  // Ventana sin marco: la barra de título la dibuja el renderer (TitleBar) y Windows pone
  // los botones nativos min/max/cerrar encima (titleBarOverlay). Tamaño/posición: tarea 12.
  const mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1100,
    height: 790,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: WINDOW_COLORS[theme].background,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(theme),
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // window.open nunca abre ventanas nuevas; los enlaces https van al navegador del sistema.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // El renderer no puede navegar fuera de la app (solo recargas del propio origen en dev).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && devUrl && url.startsWith(devUrl)) return
    event.preventDefault()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId(APP_ID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  watchNativeTheme()
  // Autodetección del backend en segundo plano; la ventana no la espera.
  getBackendInfo().catch((err) => log.error('No se pudo resolver el backend', err))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
