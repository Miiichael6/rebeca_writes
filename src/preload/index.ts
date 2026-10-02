import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import { IpcChannel, type IpcEventMap, type IpcInvokeMap, type AppApi } from '@shared/ipc'

function invoke<C extends keyof IpcInvokeMap>(
  channel: C,
  ...args: IpcInvokeMap[C]['args']
): Promise<IpcInvokeMap[C]['result']> {
  return ipcRenderer.invoke(channel, ...args)
}

/** Suscribe a un evento del main y devuelve la función para cancelar la suscripción. */
function on<C extends keyof IpcEventMap>(
  channel: C,
  listener: (payload: IpcEventMap[C]) => void
): () => void {
  const wrapped = (_event: IpcRendererEvent, payload: IpcEventMap[C]): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

// Solo funciones concretas: el renderer nunca recibe `ipcRenderer`.
const api: AppApi = {
  app: {
    getVersion: () => invoke(IpcChannel.AppGetVersion),
    getPreferredLanguages: () => invoke(IpcChannel.AppGetPreferredLanguages),
    openLogs: () => invoke(IpcChannel.AppOpenLogs),
    getModelsDir: () => invoke(IpcChannel.AppGetModelsDir),
    openModelsDir: () => invoke(IpcChannel.AppOpenModelsDir),
    notify: (title, body) => invoke(IpcChannel.AppNotify, title, body)
  },
  clipboard: {
    writeText: (text) => invoke(IpcChannel.ClipboardWriteText, text)
  },
  settings: {
    get: () => invoke(IpcChannel.SettingsGet),
    set: (patch) => invoke(IpcChannel.SettingsSet, patch),
    onChanged: (listener) => on(IpcChannel.SettingsChanged, listener)
  },
  theme: {
    getResolved: () => invoke(IpcChannel.ThemeGetResolved),
    onChanged: (listener) => on(IpcChannel.ThemeChanged, listener)
  },
  backend: {
    getInfo: () => invoke(IpcChannel.BackendGetInfo),
    onFallback: (listener) => on(IpcChannel.BackendFallback, listener),
    onChanged: (listener) => on(IpcChannel.BackendChanged, () => listener()),
    cuda: {
      getStatus: () => invoke(IpcChannel.BackendCudaStatus),
      download: () => invoke(IpcChannel.BackendCudaDownload),
      cancel: () => invoke(IpcChannel.BackendCudaCancel),
      remove: () => invoke(IpcChannel.BackendCudaRemove),
      onProgress: (listener) => on(IpcChannel.BackendCudaProgress, listener)
    }
  },
  models: {
    list: () => invoke(IpcChannel.ModelsList),
    download: (id) => invoke(IpcChannel.ModelsDownload, id),
    cancel: (id) => invoke(IpcChannel.ModelsCancel, id),
    delete: (id) => invoke(IpcChannel.ModelsDelete, id),
    pickCustomFile: () => invoke(IpcChannel.ModelsPickCustomFile),
    addCustom: (path, name) => invoke(IpcChannel.ModelsAddCustom, path, name),
    onProgress: (listener) => on(IpcChannel.ModelsProgress, listener),
    onChanged: (listener) => on(IpcChannel.ModelsChanged, () => listener())
  },
  speakers: {
    prepareModel: () => invoke(IpcChannel.SpeakersPrepareModel)
  },
  media: {
    openFiles: (filterLabels) => invoke(IpcChannel.MediaOpenFiles, filterLabels),
    onPreview: (listener) => on(IpcChannel.MediaPreview, listener),
    clearPreviewCache: () => invoke(IpcChannel.MediaClearPreviewCache),
    getPreviewCacheSize: () => invoke(IpcChannel.MediaPreviewCacheSize)
  },
  history: {
    create: (input) => invoke(IpcChannel.HistoryCreate, input),
    updateSegment: (id, index, text) => invoke(IpcChannel.HistoryUpdateSegment, id, index, text),
    list: () => invoke(IpcChannel.HistoryList),
    get: (id) => invoke(IpcChannel.HistoryGet, id),
    search: (query) => invoke(IpcChannel.HistorySearch, query),
    rename: (id, displayName) => invoke(IpcChannel.HistoryRename, id, displayName),
    renameSpeaker: (id, speakerId, name) =>
      invoke(IpcChannel.HistoryRenameSpeaker, id, speakerId, name),
    remove: (id) => invoke(IpcChannel.HistoryRemove, id),
    clear: () => invoke(IpcChannel.HistoryClear),
    relocate: (id, filterLabels) => invoke(IpcChannel.HistoryRelocate, id, filterLabels),
    showInFolder: (id) => invoke(IpcChannel.HistoryShowInFolder, id),
    retranscribe: (id) => invoke(IpcChannel.HistoryRetranscribe, id),
    onAdded: (listener) => on(IpcChannel.HistoryAdded, listener)
  },
  export: {
    save: (entryId, format, segments, options, filterLabel) =>
      invoke(IpcChannel.ExportSave, entryId, format, segments, options, filterLabel),
    saveSrtBeside: (entryId, segments, overwrite, speakerNames) =>
      invoke(IpcChannel.ExportSaveSrtBeside, entryId, segments, overwrite, speakerNames),
    showInFolder: (path) => invoke(IpcChannel.ExportShowInFolder, path)
  },
  queue: {
    getState: () => invoke(IpcChannel.QueueGet),
    pickFiles: (filterLabels) => invoke(IpcChannel.QueuePickFiles, filterLabels),
    // `File.path` ya no existe: la ruta real solo se puede sacar aquí, en el preload.
    addDropped: (files) =>
      invoke(
        IpcChannel.QueueAddPaths,
        Array.from(files, (file) => webUtils.getPathForFile(file)).filter(Boolean)
      ),
    onFilesReceived: (listener) => on(IpcChannel.QueueFilesReceived, listener),
    remove: (id) => invoke(IpcChannel.QueueRemove, id),
    reorder: (ids) => invoke(IpcChannel.QueueReorder, ids),
    pause: () => invoke(IpcChannel.QueuePause),
    resume: () => invoke(IpcChannel.QueueResume),
    discard: () => invoke(IpcChannel.QueueDiscard),
    cancelCurrent: () => invoke(IpcChannel.QueueCancelCurrent),
    clearCompleted: () => invoke(IpcChannel.QueueClearCompleted),
    openJob: (id) => invoke(IpcChannel.QueueOpenJob, id),
    onChanged: (listener) => on(IpcChannel.QueueChanged, listener),
    onDrained: (listener) => on(IpcChannel.QueueDrained, listener)
  },
  live: {
    current: () => invoke(IpcChannel.LiveCurrent),
    onStarted: (listener) => on(IpcChannel.LiveStarted, listener),
    onEnded: (listener) => on(IpcChannel.LiveEnded, listener)
  },
  mic: {
    start: (source, name) => invoke(IpcChannel.MicStart, source, name),
    stop: () => invoke(IpcChannel.MicStop),
    getState: () => invoke(IpcChannel.MicGetState),
    listDevices: () => invoke(IpcChannel.MicListDevices),
    onChanged: (listener) => on(IpcChannel.MicChanged, listener),
    onLevel: (listener) => on(IpcChannel.MicLevel, listener),
    onMonitorLevel: (listener) => on(IpcChannel.MicMonitorLevel, listener),
    startMonitor: (source, micId) => invoke(IpcChannel.MicMonitorStart, source, micId),
    stopMonitor: () => invoke(IpcChannel.MicMonitorStop),
    getRecordingsDir: () => invoke(IpcChannel.MicGetRecordingsDir),
    pickRecordingsDir: () => invoke(IpcChannel.MicPickRecordingsDir),
    openRecordingsDir: () => invoke(IpcChannel.MicOpenRecordingsDir)
  },
  dock: {
    get: () => invoke(IpcChannel.DockGet),
    hover: () => invoke(IpcChannel.DockHover),
    press: (button, recordingName) => invoke(IpcChannel.DockPress, button, recordingName),
    onView: (listener) => on(IpcChannel.DockView, listener),
    openMenu: () => invoke(IpcChannel.DockOpenMenu),
    menuIsOpen: () => invoke(IpcChannel.DockMenuIsOpen),
    onMenuOpen: (listener) => on(IpcChannel.DockMenuOpen, listener),
    chooseMenu: (action) => invoke(IpcChannel.DockMenuAction, action),
    setMenuSize: (size) => invoke(IpcChannel.DockMenuSize, size)
  },
  hotkey: {
    getStatus: () => invoke(IpcChannel.HotkeyGetStatus),
    onStatus: (listener) => on(IpcChannel.HotkeyStatusChanged, listener),
    setPaused: (paused) => invoke(IpcChannel.HotkeySetPaused, paused),
    setNameTemplates: (templates) => invoke(IpcChannel.HotkeySetNameTemplates, templates)
  },
  transcribe: {
    start: (job) => invoke(IpcChannel.TranscribeStart, job),
    cancel: (jobId) => invoke(IpcChannel.TranscribeCancel, jobId),
    onSegment: (listener) => on(IpcChannel.TranscribeSegment, listener),
    onProgress: (listener) => on(IpcChannel.TranscribeProgress, listener),
    onDone: (listener) => on(IpcChannel.TranscribeDone, listener),
    onError: (listener) => on(IpcChannel.TranscribeError, listener)
  },
  updates: {
    getStatus: () => invoke(IpcChannel.UpdatesGetStatus),
    check: () => invoke(IpcChannel.UpdatesCheck),
    download: () => invoke(IpcChannel.UpdatesDownload),
    install: () => invoke(IpcChannel.UpdatesInstall),
    onStatus: (listener) => on(IpcChannel.UpdatesStatus, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
