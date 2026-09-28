import { app, shell, BrowserWindow, nativeTheme, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { APP_ID, APP_NAME } from '@shared/app'
import log from 'electron-log/main'
import { registerIpcHandlers } from './ipc'
import { getBackendInfo } from './engine/backend'
import { resolvedTheme, titleBarOverlay, watchNativeTheme } from './theme'
import { WINDOW_COLORS } from '@shared/theme'
import type { WindowBounds } from '@shared/settings'
import { setupLogging } from './logging'
import { flushAllWrites, hasPendingWrites } from './services/fsAtomic'
import { handleMediaProtocol, registerMediaScheme } from './services/mediaProtocol'
import { disposePreviews } from './services/previews'
import { getSettings, loadSettings, onSettingsChanged, updateSettings } from './services/settings'

app.setName(APP_NAME)
setupLogging()
registerMediaScheme()

const MIN_WIDTH = 960
const MIN_HEIGHT = 600
/** Espera tras el último resize/move antes de guardar el tamaño de la ventana. */
const SAVE_BOUNDS_MS = 500

/** Tamaño y posición guardados; la posición se descarta si ya no cae en ningún monitor. */
function initialBounds(
  saved: WindowBounds
): Electron.Rectangle | { width: number; height: number } {
  const width = Math.max(MIN_WIDTH, saved.width)
  const height = Math.max(MIN_HEIGHT, saved.height)
  if (saved.x === undefined || saved.y === undefined) return { width, height }
  const bounds = { x: saved.x, y: saved.y, width, height }
  const { workArea } = screen.getDisplayMatching(bounds)
  // La barra de título tiene que quedar a la vista para poder arrastrar la ventana.
  const visible =
    bounds.x < workArea.x + workArea.width - 100 &&
    bounds.x + bounds.width > workArea.x + 100 &&
    bounds.y >= workArea.y - 10 &&
    bounds.y < workArea.y + workArea.height - 50
  return visible ? bounds : { width, height }
}

/** Guarda tamaño, posición y maximizado. Se usa `getNormalBounds` para no guardar el tamaño maximizado. */
function trackBounds(window: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null
  const save = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
    if (window.isDestroyed() || window.isMinimized()) return
    const { x, y, width, height } = window.getNormalBounds()
    updateSettings({ window: { x, y, width, height, maximized: window.isMaximized() } }).catch(
      (err) => log.error('No se pudo guardar el tamaño de la ventana', err)
    )
  }
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, SAVE_BOUNDS_MS)
  }
  window.on('resize', schedule)
  window.on('move', schedule)
  window.on('maximize', save)
  window.on('unmaximize', save)
  window.on('close', save)
}

function createWindow(): void {
  const theme = resolvedTheme()
  const saved = getSettings().window

  // Ventana sin marco: la barra de título la dibuja el renderer (TitleBar) y Windows pone
  // los botones nativos min/max/cerrar encima (titleBarOverlay).
  const mainWindow = new BrowserWindow({
    title: APP_NAME,
    ...initialBounds(saved),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
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
    if (saved.maximized) mainWindow.maximize()
    mainWindow.show()
  })
  trackBounds(mainWindow)

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
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId(APP_ID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Antes de la ventana: de aquí salen el tema y el tamaño con que se abre.
  const settings = await loadSettings().catch((err) => {
    log.error('No se pudo leer settings.json; se usan los valores por defecto', err)
    return null
  })
  if (settings) nativeTheme.themeSource = settings.theme
  // Cambiar themeSource dispara nativeTheme 'updated' → watchNativeTheme recolorea la ventana.
  onSettingsChanged(({ theme }) => {
    if (nativeTheme.themeSource !== theme) nativeTheme.themeSource = theme
  })

  handleMediaProtocol()
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
app.on('will-quit', () => disposePreviews())

// Settings, historial y cola se guardan con debounce: al salir se escribe lo pendiente.
let writesFlushed = false
app.on('before-quit', (event) => {
  if (writesFlushed || !hasPendingWrites()) return
  event.preventDefault()
  flushAllWrites()
    .catch((err) => log.error('No se pudieron guardar los datos al salir', err))
    .finally(() => {
      writesFlushed = true
      app.quit()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
