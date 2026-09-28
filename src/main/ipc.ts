import { app, ipcMain, nativeTheme, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'
import { resolvedTheme } from './theme'

type Handler<C extends keyof IpcInvokeMap> = (
  event: IpcMainInvokeEvent,
  ...args: IpcInvokeMap[C]['args']
) => IpcInvokeMap[C]['result'] | Promise<IpcInvokeMap[C]['result']>

function handle<C extends keyof IpcInvokeMap>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1])
}

const THEME_MODES = new Set(['light', 'dark', 'system'])

export function registerIpcHandlers(): void {
  handle(IpcChannel.AppGetVersion, () => app.getVersion())
  handle(IpcChannel.AppGetPreferredLanguages, () => {
    const languages = app.getPreferredSystemLanguages()
    return languages.length > 0 ? languages : [app.getLocale()]
  })

  handle(IpcChannel.ThemeGetResolved, () => resolvedTheme())
  handle(IpcChannel.ThemeSetMode, (_event, mode) => {
    if (!THEME_MODES.has(mode)) throw new Error(`Modo de tema inválido: ${mode}`)
    // Cambiar themeSource dispara nativeTheme 'updated' → watchNativeTheme recolorea la ventana.
    nativeTheme.themeSource = mode
    return resolvedTheme()
  })
}
