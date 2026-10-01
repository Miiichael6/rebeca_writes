import { BrowserWindow, screen } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { DockView } from '@shared/dock'
import type { DockSurface } from '../../application/ports/dockSurface'
import { dockWidth } from '../../domain/dock/dockWidth'
import { contains, dockBounds, slidePath } from '../../domain/dock/edge'
import { loadRendererPage, secureWebPreferences } from './rendererPage'

const SLIDE_FRAMES = 8
const FRAME_MS = 16

function workArea(): Electron.Rectangle {
  return screen.getPrimaryDisplay().workArea
}

/**
 * La ventana del dock: transparente, sin marco, siempre encima, fuera de la barra de tareas y
 * sin quitarle nunca el foco a la app que se está usando. Carga el renderer en `#/dock`.
 */
export function createDockWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...dockBounds(workArea(), null),
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
    focusable: false,
    alwaysOnTop: true,
    webPreferences: secureWebPreferences()
  })
  // También encima de las apps a pantalla completa.
  window.setAlwaysOnTop(true, 'screen-saver')
  window.once('ready-to-show', () => window.showInactive())
  loadRendererPage(window, '/dock')
  return window
}

/**
 * Si el ratón está sobre el dock fuera. Se le pregunta al sistema y no a la página: mientras la
 * ventana se desliza bajo un ratón quieto, la página avisa de un "ratón fuera" falso y el dock
 * saldría y entraría sin parar.
 */
export function cursorOnDock(view: DockView): boolean {
  return contains(dockBounds(workArea(), dockWidth(view)), screen.getCursorScreenPoint())
}

/**
 * Desliza el dock fuera o al borde, a tamaño de píldora (del largo que pide `view`); al llegar
 * al borde toma la forma de barra.
 */
export function slideDock(window: BrowserWindow, view: DockView, done: () => void): () => void {
  const width = dockWidth(view)
  const target = dockBounds(workArea(), view.out ? width : null)
  const pill = dockBounds(workArea(), width)
  const path = slidePath(window.getBounds().x, target.x, SLIDE_FRAMES)
  const timer = setInterval(() => {
    const x = path.shift()
    if (window.isDestroyed() || x === undefined) {
      clearInterval(timer)
      if (!window.isDestroyed()) window.setBounds(target)
      done()
      return
    }
    window.setBounds({ ...pill, x })
  }, FRAME_MS)
  return () => clearInterval(timer)
}

/** Adaptador de `DockSurface` sobre la ventana del dock. */
export class ElectronDockSurface implements DockSurface {
  private window: BrowserWindow | null = null
  private stopSlide: (() => void) | null = null
  /** La última vista: de ella sale el largo del dock fuera. */
  private view: DockView | null = null

  open(): void {
    if (this.window && !this.window.isDestroyed()) return
    const window = createDockWindow()
    window.on('closed', () => {
      if (this.window === window) this.window = null
    })
    this.window = window
  }

  close(): void {
    this.stopSlide?.()
    this.window?.destroy()
    this.window = null
  }

  show(view: DockView): void {
    const window = this.window
    if (!window || window.isDestroyed()) return
    this.view = view
    this.stopSlide?.()
    this.stopSlide = slideDock(window, view, () => (this.stopSlide = null))
    window.webContents.send(IpcChannel.DockView, view)
  }

  cursorInside(): boolean {
    return this.view !== null && cursorOnDock(this.view)
  }
}
