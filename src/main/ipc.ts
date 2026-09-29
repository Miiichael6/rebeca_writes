import { mkdir } from 'fs/promises'
import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Notification,
  shell,
  type IpcMainInvokeEvent
} from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'
import { logsDir } from './logging'
import { resolvedTheme } from './theme'
import { getBackendInfo } from './engine/backend'
import { cancelTranscription, startTranscription } from './engine/transcribeManager'
import {
  clearHistoryEntries,
  createHistoryEntry,
  getHistoryEntry,
  listHistoryEntries,
  relocateHistoryEntry,
  removeHistoryEntry,
  renameHistoryEntry,
  searchHistoryEntries,
  showHistoryEntryInFolder,
  updateHistorySegment
} from './services/history'
import {
  addPathsToQueue,
  openFilesDialog,
  openQueueJob,
  pickFilesToQueue,
  queue,
  retranscribeEntry
} from './services/queue'
import { saveExport, saveSrtBesideEntry, showExportInFolder } from './services/exporter'
import { clearPreviewCache, previewCacheSize } from './services/previews'
import {
  cancelCudaDownload,
  cudaPackageStatus,
  downloadCudaPackage,
  removeCudaPackage
} from './services/cudaPackage'
import { loadSettings, updateSettings } from './services/settings'
import { checkForUpdates, downloadUpdate, getUpdateStatus, installUpdate } from './services/updater'
import {
  addCustomModel,
  cancelDownload,
  deleteModel,
  downloadModel,
  listModels,
  modelsDir,
  pickCustomModelFile
} from './services/models'

type Handler<C extends keyof IpcInvokeMap> = (
  event: IpcMainInvokeEvent,
  ...args: IpcInvokeMap[C]['args']
) => IpcInvokeMap[C]['result'] | Promise<IpcInvokeMap[C]['result']>

/** Notificaciones mostradas: sin una referencia viva, el GC se las lleva y el clic no llega. */
const notifications = new Set<Notification>()

function notify(window: BrowserWindow | null, title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  notifications.add(notification)
  notification.on('close', () => notifications.delete(notification))
  notification.on('click', () => {
    notifications.delete(notification)
    if (!window || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  })
  notification.show()
}

/** Abre una carpeta de `userData` en el Explorador; la crea si todavía no existe. */
async function openFolder(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  const error = await shell.openPath(dir)
  if (error) throw new Error(error)
}

function handle<C extends keyof IpcInvokeMap>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1])
}

export function registerIpcHandlers(): void {
  handle(IpcChannel.AppGetVersion, () => app.getVersion())
  handle(IpcChannel.AppGetPreferredLanguages, () => {
    const languages = app.getPreferredSystemLanguages()
    return languages.length > 0 ? languages : [app.getLocale()]
  })
  handle(IpcChannel.AppOpenLogs, () => openFolder(logsDir()))
  handle(IpcChannel.AppGetModelsDir, () => modelsDir())
  handle(IpcChannel.AppOpenModelsDir, () => openFolder(modelsDir()))

  handle(IpcChannel.AppNotify, (event, title, body) =>
    notify(BrowserWindow.fromWebContents(event.sender), String(title), String(body))
  )

  handle(IpcChannel.ClipboardWriteText, (_event, text) => clipboard.writeText(String(text)))

  handle(IpcChannel.SettingsGet, () => loadSettings())
  // El patch se valida clave por clave en `mergeSettings`: lo inválido se ignora.
  handle(IpcChannel.SettingsSet, (_event, patch) => updateSettings(patch))

  handle(IpcChannel.ThemeGetResolved, () => resolvedTheme())

  handle(IpcChannel.BackendGetInfo, () => getBackendInfo())
  handle(IpcChannel.BackendCudaStatus, () => cudaPackageStatus())
  handle(IpcChannel.BackendCudaDownload, () => downloadCudaPackage())
  handle(IpcChannel.BackendCudaCancel, () => cancelCudaDownload())
  handle(IpcChannel.BackendCudaRemove, () => removeCudaPackage())

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

  handle(IpcChannel.MediaOpenFiles, (event, filterLabels) =>
    openFilesDialog(BrowserWindow.fromWebContents(event.sender), filterLabels)
  )
  handle(IpcChannel.MediaClearPreviewCache, () => clearPreviewCache())
  handle(IpcChannel.MediaPreviewCacheSize, () => previewCacheSize())

  handle(IpcChannel.HistoryCreate, (_event, input) => createHistoryEntry(input))
  handle(IpcChannel.HistoryUpdateSegment, (_event, id, index, text) =>
    updateHistorySegment(id, index, text)
  )
  handle(IpcChannel.HistoryList, () => listHistoryEntries())
  handle(IpcChannel.HistoryGet, (_event, id) => getHistoryEntry(id))
  handle(IpcChannel.HistorySearch, (_event, query) => searchHistoryEntries(query))
  handle(IpcChannel.HistoryRename, (_event, id, displayName) => renameHistoryEntry(id, displayName))
  handle(IpcChannel.HistoryRemove, (_event, id) => removeHistoryEntry(id))
  handle(IpcChannel.HistoryClear, () => clearHistoryEntries())
  handle(IpcChannel.HistoryRelocate, (event, id, filterLabels) =>
    relocateHistoryEntry(BrowserWindow.fromWebContents(event.sender), id, filterLabels)
  )
  handle(IpcChannel.HistoryShowInFolder, (_event, id) => showHistoryEntryInFolder(id))
  handle(IpcChannel.HistoryRetranscribe, (_event, id) => retranscribeEntry(id))

  handle(IpcChannel.ExportSave, (event, entryId, format, segments, options, filterLabel) =>
    saveExport(
      BrowserWindow.fromWebContents(event.sender),
      entryId,
      format,
      segments,
      options,
      filterLabel
    )
  )
  handle(IpcChannel.ExportSaveSrtBeside, (_event, entryId, segments, overwrite) =>
    saveSrtBesideEntry(entryId, segments, overwrite)
  )
  handle(IpcChannel.ExportShowInFolder, (_event, path) => showExportInFolder(path))

  handle(IpcChannel.QueueGet, () => queue().getState())
  handle(IpcChannel.QueuePickFiles, (event, filterLabels) =>
    pickFilesToQueue(BrowserWindow.fromWebContents(event.sender), filterLabels)
  )
  handle(IpcChannel.QueueAddPaths, (_event, paths) => addPathsToQueue(paths))
  handle(IpcChannel.QueueRemove, (_event, id) => queue().remove(String(id)))
  handle(IpcChannel.QueueReorder, (_event, ids) =>
    queue().reorder(Array.isArray(ids) ? ids.map(String) : [])
  )
  handle(IpcChannel.QueuePause, () => queue().pause())
  handle(IpcChannel.QueueResume, () => queue().resume())
  handle(IpcChannel.QueueDiscard, () => queue().discard())
  handle(IpcChannel.QueueCancelCurrent, () => queue().cancelCurrent())
  handle(IpcChannel.QueueClearCompleted, () => queue().clearCompleted())
  handle(IpcChannel.QueueOpenJob, (_event, id) => openQueueJob(id))

  handle(IpcChannel.TranscribeStart, (_event, job) => startTranscription(job))
  handle(IpcChannel.TranscribeCancel, (_event, jobId) => cancelTranscription(String(jobId)))

  handle(IpcChannel.UpdatesGetStatus, () => getUpdateStatus())
  handle(IpcChannel.UpdatesCheck, () => checkForUpdates())
  handle(IpcChannel.UpdatesDownload, () => downloadUpdate())
  handle(IpcChannel.UpdatesInstall, () => installUpdate())
}
