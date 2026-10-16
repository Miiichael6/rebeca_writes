import { BrowserWindow, nativeTheme } from 'electron'
import { IpcChannel } from '@shared/ipc'
import { TITLE_BAR_HEIGHT, WINDOW_COLORS, type ResolvedTheme } from '@shared/theme'

export function resolvedTheme(): ResolvedTheme {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

/** Opciones de `titleBarOverlay` (botones nativos min/max/cerrar) para el tema dado. */
export function titleBarOverlay(theme: ResolvedTheme): Electron.TitleBarOverlayOptions {
  const { background, symbol } = WINDOW_COLORS[theme]
  return { color: background, symbolColor: symbol, height: TITLE_BAR_HEIGHT }
}

/**
 * Ventanas creadas con `titleBarOverlay`: las únicas que se recolorean. Las del dock son
 * transparentes y sin barra; `setTitleBarOverlay` lanza en ellas y el fondo las taparía.
 */
const overlayWindows = new WeakSet<BrowserWindow>()

/** Marca una ventana creada con `titleBarOverlay` para que siga el tema. */
export function followThemeOverlay(window: BrowserWindow): void {
  overlayWindows.add(window)
}

function applyTheme(window: BrowserWindow, theme: ResolvedTheme): void {
  if (!overlayWindows.has(window)) return
  window.setBackgroundColor(WINDOW_COLORS[theme].background)
  window.setTitleBarOverlay(titleBarOverlay(theme))
}

/**
 * Sigue los cambios de `nativeTheme` (tema de Windows, o `themeSource` cambiado desde la app),
 * recolorea la barra de título de cada ventana y avisa al renderer.
 */
export function watchNativeTheme(): void {
  let last = resolvedTheme()
  nativeTheme.on('updated', () => {
    const theme = resolvedTheme()
    if (theme === last) return
    last = theme
    for (const window of BrowserWindow.getAllWindows()) {
      applyTheme(window, theme)
      window.webContents.send(IpcChannel.ThemeChanged, theme)
    }
  })
}
