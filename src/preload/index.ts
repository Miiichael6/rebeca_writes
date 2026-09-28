import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannel, type IpcEventMap, type IpcInvokeMap, type TranscribaApi } from '@shared/ipc'

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
const api: TranscribaApi = {
  app: {
    getVersion: () => invoke(IpcChannel.AppGetVersion),
    getPreferredLanguages: () => invoke(IpcChannel.AppGetPreferredLanguages),
    openLogs: () => invoke(IpcChannel.AppOpenLogs),
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
    onFallback: (listener) => on(IpcChannel.BackendFallback, listener)
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
  media: {
    pickFile: (filterLabels) => invoke(IpcChannel.MediaPickFile, filterLabels),
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
    remove: (id) => invoke(IpcChannel.HistoryRemove, id),
    clear: () => invoke(IpcChannel.HistoryClear),
    relocate: (id, filterLabels) => invoke(IpcChannel.HistoryRelocate, id, filterLabels),
    showInFolder: (id) => invoke(IpcChannel.HistoryShowInFolder, id),
    retranscribe: (id) => invoke(IpcChannel.HistoryRetranscribe, id),
    onAdded: (listener) => on(IpcChannel.HistoryAdded, listener)
  },
  queue: {
    getState: () => invoke(IpcChannel.QueueGet),
    pickFiles: (filterLabels) => invoke(IpcChannel.QueuePickFiles, filterLabels),
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
  transcribe: {
    start: (job) => invoke(IpcChannel.TranscribeStart, job),
    cancel: (jobId) => invoke(IpcChannel.TranscribeCancel, jobId),
    onSegment: (listener) => on(IpcChannel.TranscribeSegment, listener),
    onProgress: (listener) => on(IpcChannel.TranscribeProgress, listener),
    onDone: (listener) => on(IpcChannel.TranscribeDone, listener),
    onError: (listener) => on(IpcChannel.TranscribeError, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
