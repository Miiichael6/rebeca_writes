import { mkdir } from 'fs/promises'
import { app, BrowserWindow, clipboard, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'
import { logsDir } from './logging'
import { resolvedTheme } from './theme'
import { getBackendInfo } from './engine/backend'
import { cancelTranscription, startTranscription } from './engine/transcribeManager'
import { createHistoryEntry, updateHistorySegment } from './services/history'
import { pickMediaFile } from './services/mediaOpen'
import { clearPreviewCache, previewCacheSize } from './services/previews'
import { loadSettings, updateSettings } from './services/settings'
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

export function registerIpcHandlers(): void {
  handle(IpcChannel.AppGetVersion, () => app.getVersion())
  handle(IpcChannel.AppGetPreferredLanguages, () => {
    const languages = app.getPreferredSystemLanguages()
    return languages.length > 0 ? languages : [app.getLocale()]
  })
  handle(IpcChannel.AppOpenLogs, async () => {
    const dir = logsDir()
    await mkdir(dir, { recursive: true })
    const error = await shell.openPath(dir)
    if (error) throw new Error(error)
  })

  handle(IpcChannel.ClipboardWriteText, (_event, text) => clipboard.writeText(String(text)))

  handle(IpcChannel.SettingsGet, () => loadSettings())
  // El patch se valida clave por clave en `mergeSettings`: lo inválido se ignora.
  handle(IpcChannel.SettingsSet, (_event, patch) => updateSettings(patch))

  handle(IpcChannel.ThemeGetResolved, () => resolvedTheme())

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

  handle(IpcChannel.HistoryCreate, (_event, input) => createHistoryEntry(input))
  handle(IpcChannel.HistoryUpdateSegment, (_event, id, index, text) =>
    updateHistorySegment(id, index, text)
  )

  handle(IpcChannel.TranscribeStart, (_event, job) => startTranscription(job))
  handle(IpcChannel.TranscribeCancel, (_event, jobId) => cancelTranscription(String(jobId)))
}
