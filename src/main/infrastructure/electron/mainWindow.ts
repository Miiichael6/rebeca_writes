import { join } from 'path'
import { BrowserWindow, screen, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'
import { appTitle } from '@shared/app'
import type { WindowBounds } from '@shared/settings'
import { WINDOW_COLORS } from '@shared/theme'
import type { Logger } from '../../application/ports/eventPublisher'
import type { SettingsRepository } from '../../application/ports/settingsRepository'
import { resolvedTheme, titleBarOverlay } from '../../theme'

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

/** La ventana principal: su creación, el tamaño guardado y enfocarla desde fuera. */
export class MainWindow {
  private window: BrowserWindow | null = null

  constructor(
    private readonly settings: SettingsRepository,
    private readonly log: Logger
  ) {}

  /** La ventana abierta, o `null` si no hay. */
  current(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null
  }

  focus(): void {
    const window = this.current()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  create(): void {
    const theme = resolvedTheme()
    const saved = this.settings.get().window

    // Ventana sin marco: la barra de título la dibuja el renderer (TitleBar) y Windows pone
    // los botones nativos min/max/cerrar encima (titleBarOverlay).
    const window = new BrowserWindow({
      // Solo el servidor de desarrollo define esta variable (ni el instalador ni `npm start`).
      title: appTitle(Boolean(process.env['ELECTRON_RENDERER_URL'])),
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

    window.on('ready-to-show', () => {
      if (saved.maximized) window.maximize()
      window.show()
    })
    this.trackBounds(window)

    // window.open nunca abre ventanas nuevas; los enlaces https van al navegador del sistema.
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) shell.openExternal(url)
      return { action: 'deny' }
    })

    // El renderer no puede navegar fuera de la app (solo recargas del propio origen en dev).
    window.webContents.on('will-navigate', (event, url) => {
      const devUrl = process.env['ELECTRON_RENDERER_URL']
      if (is.dev && devUrl && url.startsWith(devUrl)) return
      event.preventDefault()
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      window.loadFile(join(__dirname, '../renderer/index.html'))
    }
    this.window = window
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
  }

  /** Guarda tamaño, posición y maximizado. Se usa `getNormalBounds` para no guardar el tamaño maximizado. */
  private trackBounds(window: BrowserWindow): void {
    let timer: NodeJS.Timeout | null = null
    const save = (): void => {
      if (timer) clearTimeout(timer)
      timer = null
      if (window.isDestroyed() || window.isMinimized()) return
      const { x, y, width, height } = window.getNormalBounds()
      this.settings
        .update({ window: { x, y, width, height, maximized: window.isMaximized() } })
        .catch((err) => this.log.error('No se pudo guardar el tamaño de la ventana', err))
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
}
