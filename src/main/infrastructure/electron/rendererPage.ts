import { join } from 'path'
import type { BrowserWindow, WebPreferences } from 'electron'
import { is } from '@electron-toolkit/utils'

/** Las de todas las ventanas de la app (spec §6): el renderer no toca Node. */
export function secureWebPreferences(): WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}

/** URL del servidor de desarrollo; solo existe con `npm run dev`. */
export function devRendererUrl(): string | undefined {
  return is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined
}

/**
 * Carga el renderer: con HMR en desarrollo y el `index.html` empaquetado si no. `route` es el
 * hash (`/dock`) de las ventanas que no son la principal.
 */
export function loadRendererPage(window: BrowserWindow, route?: string): void {
  const devUrl = devRendererUrl()
  if (devUrl) void window.loadURL(route ? `${devUrl}#${route}` : devUrl)
  else void window.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
}
