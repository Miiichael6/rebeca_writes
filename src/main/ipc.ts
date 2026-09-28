import { app, BrowserWindow, ipcMain, nativeTheme, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'
import { resolvedTheme } from './theme'
import { getBackendInfo } from './engine/backend'
import { cancelTranscription, startTranscription } from './engine/transcribeManager'
import { pickMediaFile } from './services/mediaOpen'
import { clearPreviewCache, previewCacheSize } from './services/previews'
import {
  addCustomModel,
  cancelDownload,
  deleteModel,
  downloadModel,
  listModels,
  pickCustomModelFile
} from './services/models'

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

  handle(IpcChannel.BackendGetInfo, () => getBackendInfo())

  handle(IpcChannel.ModelsList, () => listModels())
  handle(IpcChannel.ModelsDownload, (_event, id) => downloadModel(String(id)))
  handle(IpcChannel.ModelsCancel, (_event, id) => cancelDownload(String(id)))
  handle(IpcChannel.ModelsDelete, (_event, id) => deleteModel(String(id)))
  handle(IpcChannel.ModelsPickCustomFile, (event) =>
    pickCustomModelFile(BrowserWindow.fromWebContents(event.sender))
  )
  handle(IpcChannel.ModelsAddCustom, (_event, path, name) =>
    addCustomModel(String(path), String(name))
  )

  handle(IpcChannel.MediaPickFile, (event, filterLabels) =>
    pickMediaFile(BrowserWindow.fromWebContents(event.sender), filterLabels)
  )
  handle(IpcChannel.MediaClearPreviewCache, () => clearPreviewCache())
  handle(IpcChannel.MediaPreviewCacheSize, () => previewCacheSize())

  handle(IpcChannel.TranscribeStart, (_event, job) => startTranscription(job))
  handle(IpcChannel.TranscribeCancel, (_event, jobId) => cancelTranscription(String(jobId)))
}
