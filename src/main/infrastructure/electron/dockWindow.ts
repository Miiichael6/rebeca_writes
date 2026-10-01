import { BrowserWindow, screen } from 'electron'
import { IpcChannel } from '@shared/ipc'
import { DOCK_CONTRACT_MS, type DockPosition, type DockView } from '@shared/dock'
import type { DockSurface } from '../../application/ports/dockSurface'
import { dockWidth } from '../../domain/dock/dockWidth'
import { contains, dockBounds, tuckedBounds, type Area, type Point } from '../../domain/dock/edge'
import { slidePoints } from '../../domain/dock/slide'
import { loadRendererPage, secureWebPreferences } from './rendererPage'

const FRAME_MS = 16

function workArea(): Electron.Rectangle {
  return screen.getPrimaryDisplay().workArea
}

/**
 * La ventana del dock: transparente, sin marco, siempre encima, fuera de la barra de tareas y
 * sin quitarle nunca el foco a la app que se está usando. Carga el renderer en `#/dock`.
 */
function createDockWindow(bounds: Area): BrowserWindow {
  const window = new BrowserWindow({
    ...bounds,
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
 * Desliza la ventana (del tamaño de `to`) de `from` a `to` y al acabar la deja en `final`.
 * Devuelve cómo pararlo a medias.
 */
function slideWindow(
  window: BrowserWindow,
  from: Point,
  to: Area,
  final: Area,
  done: () => void
): () => void {
  const path = slidePoints(from, to)
  const timer = setInterval(() => {
    const point = path.shift()
    if (window.isDestroyed() || point === undefined) {
      clearInterval(timer)
      if (!window.isDestroyed()) window.setBounds(final)
      done()
      return
    }
    window.setBounds({ ...to, ...point })
  }, FRAME_MS)
  return () => clearInterval(timer)
}

/**
 * Adaptador de `DockSurface` sobre la ventana del dock, en el borde que dice `position()`
 * (tarea 33). Sale deslizándose desde la barra; para entrar, la píldora se contrae como una gota y se desliza; si la posición cambia, salta a la nueva.
 */
export class ElectronDockSurface implements DockSurface {
  private window: BrowserWindow | null = null
  private stopSlide: (() => void) | null = null
  /** La última vista: de ella sale el largo del dock fuera. */
  private view: DockView | null = null
  /** Dónde se colocó la ventana por última vez. */
  private placedAt: DockPosition | null = null
  /** La ventana es la barra escondida (y no la píldora, quieta o a medio deslizar). */
  private atEdge = true

  constructor(private readonly position: () => DockPosition) {}

  open(): void {
    if (this.window && !this.window.isDestroyed()) return
    this.placedAt = this.position()
    this.atEdge = true
    const window = createDockWindow(dockBounds(workArea(), null, this.placedAt))
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
    this.stopSlide = null
    window.webContents.send(IpcChannel.DockView, view)
    const position = this.position()
    if (position !== this.placedAt) return this.jump(window, view, position)
    this.slide(window, view, position)
  }

  cursorInside(): boolean {
    if (!this.view || !this.placedAt) return false
    const bounds = dockBounds(workArea(), dockWidth(this.view), this.placedAt)
    return contains(bounds, screen.getCursorScreenPoint())
  }

  /** Fuera o a la barra según `view.out`: la píldora se desliza y en la barra toma su forma. */
  private slide(window: BrowserWindow, view: DockView, position: DockPosition): void {
    const area = workArea()
    const width = dockWidth(view)
    const tucked = tuckedBounds(area, width, position)
    const from = this.atEdge ? tucked : window.getBounds()
    const to = view.out ? dockBounds(area, width, position) : tucked
    const final = view.out ? to : dockBounds(area, null, position)
    this.atEdge = false
    const done = (): void => {
      this.atEdge = !view.out
      this.stopSlide = null
    }
    if (view.out) {
      this.stopSlide = slideWindow(window, from, to, final, done)
      return
    }
    // Al esconderse, primero la píldora se contrae como una gota (la anima el renderer).
    let stopMoving: (() => void) | null = null
    const wait = setTimeout(() => {
      stopMoving = slideWindow(window, from, to, final, done)
    }, DOCK_CONTRACT_MS)
    this.stopSlide = () => {
      clearTimeout(wait)
      stopMoving?.()
    }
  }

  /** La posición cambió en Configuración: sin deslizar por media pantalla, aparece en la nueva. */
  private jump(window: BrowserWindow, view: DockView, position: DockPosition): void {
    this.placedAt = position
    this.atEdge = !view.out
    window.setBounds(dockBounds(workArea(), view.out ? dockWidth(view) : null, position))
  }
}
