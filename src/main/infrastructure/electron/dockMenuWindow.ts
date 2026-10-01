import { BrowserWindow, screen } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { DockMenuSize } from '@shared/dock'
import type { DockMenuSurface } from '../../application/ports/dockSurface'
import type { Point } from '../../domain/dock/edge'
import { menuBounds } from '../../domain/dock/menuPlacement'
import { loadRendererPage, secureWebPreferences } from './rendererPage'

/** Tamaño hasta que el renderer dice lo que ocupa el menú (la ventana sigue escondida). */
const INITIAL_SIZE = { width: 320, height: 240 }

/**
 * La ventana del menú contextual del dock: transparente, sin marco, siempre encima y fuera de
 * la barra de tareas. Se crea una vez y se reutiliza escondida, para que el clic derecho la
 * muestre al momento. Carga el renderer en `#/dock-menu`.
 */
function createDockMenuWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...INITIAL_SIZE,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: { ...secureWebPreferences(), backgroundThrottling: false }
  })
  // Al nivel del dock: se muestra después, así que queda encima de él.
  window.setAlwaysOnTop(true, 'screen-saver')
  loadRendererPage(window, '/dock-menu')
  return window
}

/** Adaptador de `DockMenuSurface`: abre junto al cursor y se esconde al perder el foco. */
export class ElectronDockMenuSurface implements DockMenuSurface {
  private window: BrowserWindow | null = null
  /** Dónde estaba el cursor al abrirlo; el menú se coloca respecto a él. */
  private cursor: Point | null = null

  prepare(): void {
    this.ensureWindow()
  }

  open(): void {
    const window = this.ensureWindow()
    this.cursor = screen.getCursorScreenPoint()
    // Si aún carga, el renderer lo pregunta con `isOpen()` al montarse.
    window.webContents.send(IpcChannel.DockMenuOpen, true)
  }

  isOpen(): boolean {
    return this.cursor !== null
  }

  resize(size: DockMenuSize): void {
    const window = this.window
    if (!window || window.isDestroyed() || !this.cursor) return
    const { workArea } = screen.getDisplayNearestPoint(this.cursor)
    window.setBounds(menuBounds(this.cursor, size, workArea))
    if (window.isVisible()) return
    window.show()
    window.focus()
  }

  hide(): void {
    this.cursor = null
    const window = this.window
    if (!window || window.isDestroyed()) return
    window.hide()
    window.webContents.send(IpcChannel.DockMenuOpen, false)
  }

  close(): void {
    this.cursor = null
    this.window?.destroy()
    this.window = null
  }

  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window
    const window = createDockMenuWindow()
    // Clic fuera del menú (en otra app o en el escritorio).
    window.on('blur', () => this.hide())
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
    return window
  }
}
