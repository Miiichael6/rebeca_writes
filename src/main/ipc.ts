import { app, BrowserWindow, clipboard, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'
import { RECORDING_SOURCES, type RecordingSource } from '@shared/recording'
import type { BackendService } from './application/backendService'
import type { CudaService } from './application/cudaService'
import type { ExportService } from './application/exportService'
import type { HistoryService } from './application/historyService'
import type { LiveControl } from './application/liveControl'
import type { MediaOpener } from './application/mediaOpener'
import type { MicRecording } from './application/micRecording'
import type { ModelService } from './application/modelService'
import type { SettingsRepository } from './application/ports/settingsRepository'
import type { PreviewService } from './application/previewService'
import type { QueueIntake } from './application/queueIntake'
import type { QueueService } from './application/queueService'
import type { RecordingsFolder } from './application/recordingsFolder'
import type { TranscriptionManager } from './application/transcriptionManager'
import type { UpdateService } from './application/updateService'
import { notify, openFolder } from './infrastructure/electron/systemActions'
import { logsDir } from './infrastructure/electron/logging'
import { resolvedTheme } from './infrastructure/electron/theme'

type Handler<C extends keyof IpcInvokeMap> = (
  event: IpcMainInvokeEvent,
  ...args: IpcInvokeMap[C]['args']
) => IpcInvokeMap[C]['result'] | Promise<IpcInvokeMap[C]['result']>

/** Los casos de uso que atiende `ipc.ts`; se crean en `index.ts`. */
export interface IpcDeps {
  settings: SettingsRepository
  backends: BackendService
  cuda: CudaService
  models: ModelService
  previews: PreviewService
  opener: MediaOpener
  history: HistoryService
  exporter: ExportService
  queue: QueueService
  intake: QueueIntake
  manager: TranscriptionManager
  live: LiveControl
  mic: MicRecording
  recordingsFolder: RecordingsFolder
  updates: UpdateService
}

function handle<C extends keyof IpcInvokeMap>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1])
}

/** La ventana que hizo la petición: dueña de los diálogos que se abran. */
const ownerOf = (event: IpcMainInvokeEvent): BrowserWindow | null =>
  BrowserWindow.fromWebContents(event.sender)

/**
 * Adaptador de entrada: cada canal IPC valida lo mínimo y delega en un caso de uso. Aquí no
 * hay reglas de negocio.
 */
export function registerIpcHandlers(deps: IpcDeps): void {
  const {
    settings,
    backends,
    cuda,
    models,
    previews,
    history,
    exporter,
    queue,
    intake,
    manager,
    live,
    mic,
    recordingsFolder,
    updates
  } = deps

  handle(IpcChannel.AppGetVersion, () => app.getVersion())
  handle(IpcChannel.AppGetPreferredLanguages, () => {
    const languages = app.getPreferredSystemLanguages()
    return languages.length > 0 ? languages : [app.getLocale()]
  })
  handle(IpcChannel.AppOpenLogs, () => openFolder(logsDir()))
  handle(IpcChannel.AppGetModelsDir, () => models.dir)
  handle(IpcChannel.AppOpenModelsDir, () => openFolder(models.dir))

  handle(IpcChannel.AppNotify, (event, title, body) =>
    notify(ownerOf(event), String(title), String(body))
  )

  handle(IpcChannel.ClipboardWriteText, (_event, text) => clipboard.writeText(String(text)))

  handle(IpcChannel.SettingsGet, () => settings.load())
  // El patch se valida clave por clave en `mergeSettings`: lo inválido se ignora.
  handle(IpcChannel.SettingsSet, (_event, patch) => settings.update(patch))

  handle(IpcChannel.ThemeGetResolved, () => resolvedTheme())

  handle(IpcChannel.BackendGetInfo, () => backends.info())
  handle(IpcChannel.BackendCudaStatus, () => cuda.status())
  handle(IpcChannel.BackendCudaDownload, () => cuda.download())
  handle(IpcChannel.BackendCudaCancel, () => cuda.cancel())
  handle(IpcChannel.BackendCudaRemove, () => cuda.remove())

  handle(IpcChannel.ModelsList, () => models.list())
  handle(IpcChannel.ModelsDownload, (_event, id) => models.download(String(id)))
  handle(IpcChannel.ModelsCancel, (_event, id) => models.cancelDownload(String(id)))
  handle(IpcChannel.ModelsDelete, (_event, id) => models.delete(String(id)))
  handle(IpcChannel.ModelsPickCustomFile, (event) => models.pickCustomFile(ownerOf(event)))
  handle(IpcChannel.ModelsAddCustom, (_event, path, name) =>
    models.addCustom(String(path), String(name))
  )

  handle(IpcChannel.MediaOpenFiles, (event, filterLabels) =>
    intake.openFiles(ownerOf(event), filterLabels)
  )
  handle(IpcChannel.MediaClearPreviewCache, () => previews.clearCache())
  handle(IpcChannel.MediaPreviewCacheSize, () => previews.cacheSize())

  handle(IpcChannel.HistoryCreate, (_event, input) => history.create(input))
  handle(IpcChannel.HistoryUpdateSegment, (_event, id, index, text) =>
    history.updateSegment(id, index, text)
  )
  handle(IpcChannel.HistoryList, () => history.list())
  handle(IpcChannel.HistoryGet, (_event, id) => history.get(id))
  handle(IpcChannel.HistorySearch, (_event, query) => history.search(query))
  handle(IpcChannel.HistoryRename, (_event, id, displayName) => history.rename(id, displayName))
  handle(IpcChannel.HistoryRemove, (_event, id) => history.remove(id))
  handle(IpcChannel.HistoryClear, () => history.clear())
  handle(IpcChannel.HistoryRelocate, (event, id, filterLabels) =>
    history.relocate(id, () => deps.opener.pickOne(ownerOf(event), filterLabels))
  )
  handle(IpcChannel.HistoryShowInFolder, (_event, id) => history.showInFolder(id))
  handle(IpcChannel.HistoryRetranscribe, (_event, id) => intake.retranscribe(id))

  handle(IpcChannel.ExportSave, (event, entryId, format, segments, options, filterLabel) =>
    exporter.save(ownerOf(event), entryId, format, segments, options, filterLabel)
  )
  handle(IpcChannel.ExportSaveSrtBeside, (_event, entryId, segments, overwrite) =>
    exporter.saveSrtBeside(entryId, segments, overwrite)
  )
  handle(IpcChannel.ExportShowInFolder, (_event, path) => exporter.showInFolder(path))

  handle(IpcChannel.QueueGet, () => queue.getState())
  handle(IpcChannel.QueuePickFiles, (event, filterLabels) =>
    intake.pickFiles(ownerOf(event), filterLabels)
  )
  handle(IpcChannel.QueueAddPaths, (_event, paths) => intake.addPaths(paths))
  handle(IpcChannel.QueueRemove, (_event, id) => queue.remove(String(id)))
  handle(IpcChannel.QueueReorder, (_event, ids) =>
    queue.reorder(Array.isArray(ids) ? ids.map(String) : [])
  )
  handle(IpcChannel.QueuePause, () => queue.pause())
  handle(IpcChannel.QueueResume, () => queue.resume())
  handle(IpcChannel.QueueDiscard, () => queue.discard())
  handle(IpcChannel.QueueCancelCurrent, () => queue.cancelCurrent())
  handle(IpcChannel.QueueClearCompleted, () => queue.clearCompleted())
  handle(IpcChannel.QueueOpenJob, (_event, id) => intake.openJob(id))

  handle(IpcChannel.TranscribeStart, (_event, job) => manager.start(job))
  handle(IpcChannel.TranscribeCancel, (_event, jobId) => {
    if (!live.cancel(String(jobId))) manager.cancel(String(jobId))
  })
  handle(IpcChannel.LiveCurrent, () => live.current())

  handle(IpcChannel.MicStart, (_event, source, name) => {
    if (!RECORDING_SOURCES.includes(source as RecordingSource))
      return { ok: false, error: 'failed' }
    return mic.start(source, String(name))
  })
  handle(IpcChannel.MicStop, () => mic.stop())
  handle(IpcChannel.MicGetState, () => mic.state())
  handle(IpcChannel.MicListDevices, () => mic.microphones())
  handle(IpcChannel.MicMonitorStart, (_event, source, micId) =>
    mic.startMonitor(source, String(micId))
  )
  handle(IpcChannel.MicMonitorStop, () => mic.stopMonitor())
  handle(IpcChannel.MicGetRecordingsDir, () => recordingsFolder.dir())
  handle(IpcChannel.MicPickRecordingsDir, (event) => recordingsFolder.pick(ownerOf(event)))
  handle(IpcChannel.MicOpenRecordingsDir, () => openFolder(recordingsFolder.dir()))

  handle(IpcChannel.UpdatesGetStatus, () => updates.getStatus())
  handle(IpcChannel.UpdatesCheck, () => updates.check())
  handle(IpcChannel.UpdatesDownload, () => updates.download())
  handle(IpcChannel.UpdatesInstall, () => updates.install())
}
