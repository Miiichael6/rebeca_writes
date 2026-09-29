import type { ResolvedTheme } from './theme'
import type { Settings, SettingsPatch } from './settings'
import type { ExportFormat, ExportOptions } from './exporters'
import type { MediaFilterKey } from './formats'
import type {
  BackendFallback,
  BackendInfo,
  ExportSaved,
  HistoryEntry,
  HistoryOpened,
  MediaPreviewEvent,
  HistoryEntryInput,
  OpenedMedia,
  OpenFilesResult,
  QueueAddResult,
  QueueDrainedEvent,
  QueueState,
  SaveSrtBesideResult,
  Segment,
  TranscribeDoneEvent,
  TranscribeErrorEvent,
  TranscribeJob,
  TranscribeProgressEvent,
  TranscribeSegmentEvent
} from './types'
import type { ModelActionResult, ModelDownloadResult, ModelProgress, ModelStatus } from './models'

/** Canales IPC. El renderer nunca los usa directamente: pasa por `window.api`. */
export const IpcChannel = {
  AppGetVersion: 'app:get-version',
  AppGetPreferredLanguages: 'app:get-preferred-languages',
  AppOpenLogs: 'app:openLogs',
  AppGetModelsDir: 'app:get-models-dir',
  AppOpenModelsDir: 'app:openModelsDir',
  AppNotify: 'app:notify',
  ClipboardWriteText: 'clipboard:writeText',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsChanged: 'settings:changed',
  ThemeGetResolved: 'theme:get-resolved',
  ThemeChanged: 'theme:changed',
  BackendGetInfo: 'backend:get-info',
  BackendFallback: 'backend:fallback',
  ModelsList: 'models:list',
  ModelsDownload: 'models:download',
  ModelsCancel: 'models:cancel',
  ModelsDelete: 'models:delete',
  ModelsPickCustomFile: 'models:pickCustomFile',
  ModelsAddCustom: 'models:addCustom',
  ModelsProgress: 'models:progress',
  ModelsChanged: 'models:changed',
  MediaOpenFiles: 'media:openFiles',
  MediaPreview: 'media:preview',
  MediaClearPreviewCache: 'media:clearPreviewCache',
  MediaPreviewCacheSize: 'media:previewCacheSize',
  HistoryCreate: 'history:create',
  HistoryUpdateSegment: 'history:updateSegment',
  HistoryList: 'history:list',
  HistoryGet: 'history:get',
  HistorySearch: 'history:search',
  HistoryRename: 'history:rename',
  HistoryRemove: 'history:remove',
  HistoryClear: 'history:clear',
  HistoryRelocate: 'history:relocate',
  HistoryShowInFolder: 'history:showInFolder',
  HistoryRetranscribe: 'history:retranscribe',
  HistoryAdded: 'history:added',
  ExportSave: 'export:save',
  ExportSaveSrtBeside: 'export:saveSrtBeside',
  ExportShowInFolder: 'export:showInFolder',
  QueueGet: 'queue:get',
  QueuePickFiles: 'queue:pickFiles',
  QueueAddPaths: 'queue:addPaths',
  QueueFilesReceived: 'queue:filesReceived',
  QueueRemove: 'queue:remove',
  QueueReorder: 'queue:reorder',
  QueuePause: 'queue:pause',
  QueueResume: 'queue:resume',
  QueueDiscard: 'queue:discard',
  QueueCancelCurrent: 'queue:cancelCurrent',
  QueueClearCompleted: 'queue:clearCompleted',
  QueueOpenJob: 'queue:openJob',
  QueueChanged: 'queue:changed',
  QueueDrained: 'queue:drained',
  TranscribeStart: 'transcribe:start',
  TranscribeCancel: 'transcribe:cancel',
  TranscribeSegment: 'transcribe:segment',
  TranscribeProgress: 'transcribe:progress',
  TranscribeDone: 'transcribe:done',
  TranscribeError: 'transcribe:error'
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]

/** Firma de cada canal `invoke` (renderer → main): argumentos y valor de retorno. */
export interface IpcInvokeMap {
  [IpcChannel.AppGetVersion]: { args: []; result: string }
  [IpcChannel.AppGetPreferredLanguages]: { args: []; result: string[] }
  [IpcChannel.AppOpenLogs]: { args: []; result: void }
  [IpcChannel.AppGetModelsDir]: { args: []; result: string }
  [IpcChannel.AppOpenModelsDir]: { args: []; result: void }
  [IpcChannel.AppNotify]: { args: [title: string, body: string]; result: void }
  [IpcChannel.ClipboardWriteText]: { args: [text: string]; result: void }
  [IpcChannel.SettingsGet]: { args: []; result: Settings }
  [IpcChannel.SettingsSet]: { args: [patch: SettingsPatch]; result: Settings }
  [IpcChannel.ThemeGetResolved]: { args: []; result: ResolvedTheme }
  [IpcChannel.BackendGetInfo]: { args: []; result: BackendInfo }
  [IpcChannel.ModelsList]: { args: []; result: ModelStatus[] }
  [IpcChannel.ModelsDownload]: { args: [id: string]; result: ModelDownloadResult }
  [IpcChannel.ModelsCancel]: { args: [id: string]; result: void }
  [IpcChannel.ModelsDelete]: { args: [id: string]; result: ModelActionResult }
  [IpcChannel.ModelsPickCustomFile]: { args: []; result: string | null }
  [IpcChannel.ModelsAddCustom]: { args: [path: string, name: string]; result: ModelActionResult }
  [IpcChannel.MediaOpenFiles]: {
    args: [filterLabels: Record<MediaFilterKey, string>]
    result: OpenFilesResult | null
  }
  [IpcChannel.MediaClearPreviewCache]: { args: []; result: void }
  [IpcChannel.MediaPreviewCacheSize]: { args: []; result: number }
  [IpcChannel.HistoryCreate]: { args: [input: HistoryEntryInput]; result: HistoryEntry }
  [IpcChannel.HistoryUpdateSegment]: {
    args: [id: string, index: number, text: string]
    result: Segment | null
  }
  [IpcChannel.HistoryList]: { args: []; result: HistoryEntry[] }
  [IpcChannel.HistoryGet]: { args: [id: string]; result: HistoryOpened | null }
  [IpcChannel.HistorySearch]: { args: [query: string]; result: string[] }
  [IpcChannel.HistoryRename]: {
    args: [id: string, displayName: string]
    result: HistoryEntry | null
  }
  [IpcChannel.HistoryRemove]: { args: [id: string]; result: boolean }
  [IpcChannel.HistoryClear]: { args: []; result: void }
  [IpcChannel.HistoryRelocate]: {
    args: [id: string, filterLabels: Record<MediaFilterKey, string>]
    result: { entry: HistoryEntry; media: OpenedMedia } | null
  }
  [IpcChannel.HistoryShowInFolder]: { args: [id: string]; result: void }
  [IpcChannel.HistoryRetranscribe]: { args: [id: string]; result: boolean }
  [IpcChannel.ExportSave]: {
    args: [
      entryId: string,
      format: ExportFormat,
      segments: Segment[],
      options: ExportOptions,
      filterLabel: string
    ]
    result: ExportSaved | null
  }
  [IpcChannel.ExportSaveSrtBeside]: {
    args: [entryId: string, segments: Segment[], overwrite: boolean]
    result: SaveSrtBesideResult
  }
  [IpcChannel.ExportShowInFolder]: { args: [path: string]; result: void }
  [IpcChannel.QueueGet]: { args: []; result: QueueState }
  [IpcChannel.QueuePickFiles]: {
    args: [filterLabels: Record<MediaFilterKey, string>]
    result: QueueAddResult
  }
  [IpcChannel.QueueAddPaths]: { args: [paths: string[]]; result: QueueAddResult }
  [IpcChannel.QueueRemove]: { args: [id: string]; result: void }
  [IpcChannel.QueueReorder]: { args: [ids: string[]]; result: void }
  [IpcChannel.QueuePause]: { args: []; result: void }
  [IpcChannel.QueueResume]: { args: []; result: void }
  [IpcChannel.QueueDiscard]: { args: []; result: void }
  [IpcChannel.QueueCancelCurrent]: { args: []; result: void }
  [IpcChannel.QueueClearCompleted]: { args: []; result: void }
  [IpcChannel.QueueOpenJob]: {
    args: [id: string]
    result: { entry: HistoryEntry; media: OpenedMedia } | null
  }
  [IpcChannel.TranscribeStart]: { args: [job: TranscribeJob]; result: void }
  [IpcChannel.TranscribeCancel]: { args: [jobId: string]; result: void }
}

/** Eventos que el main envía al renderer (`webContents.send`) y su payload. */
export interface IpcEventMap {
  [IpcChannel.SettingsChanged]: Settings
  [IpcChannel.ThemeChanged]: ResolvedTheme
  [IpcChannel.BackendFallback]: BackendFallback
  [IpcChannel.ModelsProgress]: ModelProgress
  [IpcChannel.ModelsChanged]: void
  [IpcChannel.MediaPreview]: MediaPreviewEvent
  [IpcChannel.HistoryAdded]: HistoryEntry
  [IpcChannel.QueueChanged]: QueueState
  [IpcChannel.QueueDrained]: QueueDrainedEvent
  [IpcChannel.QueueFilesReceived]: QueueAddResult
  [IpcChannel.TranscribeSegment]: TranscribeSegmentEvent
  [IpcChannel.TranscribeProgress]: TranscribeProgressEvent
  [IpcChannel.TranscribeDone]: TranscribeDoneEvent
  [IpcChannel.TranscribeError]: TranscribeErrorEvent
}

/** API que el preload expone en `window.api`. */
export interface AppApi {
  app: {
    getVersion: () => Promise<string>
    /** Idiomas preferidos de Windows (BCP 47), del más al menos preferido. */
    getPreferredLanguages: () => Promise<string[]>
    /** Abre la carpeta de logs (`userData/logs`) en el Explorador. */
    openLogs: () => Promise<void>
    /** Carpeta donde se guardan los modelos descargados (`userData/models`). */
    getModelsDir: () => Promise<string>
    /** Abre la carpeta de modelos en el Explorador (la crea si no existe). */
    openModelsDir: () => Promise<void>
    /** Notificación de Windows; al hacer clic se enfoca la ventana. El texto llega traducido. */
    notify: (title: string, body: string) => Promise<void>
  }
  clipboard: {
    /** Copia texto al portapapeles de Windows desde el main. */
    writeText: (text: string) => Promise<void>
  }
  settings: {
    get: () => Promise<Settings>
    /**
     * Aplica un cambio parcial y devuelve los settings resultantes. Los valores inválidos se
     * ignoran. El tema se aplica en el main (`nativeTheme.themeSource`).
     */
    set: (patch: SettingsPatch) => Promise<Settings>
    /** Avisa de cada cambio, venga de esta ventana o del main. */
    onChanged: (listener: (settings: Settings) => void) => () => void
  }
  theme: {
    getResolved: () => Promise<ResolvedTheme>
    /** Avisa cuando cambia el tema efectivo (p. ej. el usuario cambia el tema de Windows). */
    onChanged: (listener: (theme: ResolvedTheme) => void) => () => void
  }
  backend: {
    /** Espera a la autodetección del primer arranque si todavía no terminó. */
    getInfo: () => Promise<BackendInfo>
    /** Avisa cuando un backend falla al cargar y se reintenta con el siguiente. */
    onFallback: (listener: (fallback: BackendFallback) => void) => () => void
  }
  models: {
    /** Modelos del catálogo y personalizados, con su estado y tamaño en disco. */
    list: () => Promise<ModelStatus[]>
    /** Descarga (o reanuda) un modelo del catálogo; resuelve al terminar, cancelar o fallar. */
    download: (id: string) => Promise<ModelDownloadResult>
    /** Cancela la descarga conservando el `.part`. */
    cancel: (id: string) => Promise<void>
    delete: (id: string) => Promise<ModelActionResult>
    /** Diálogo para elegir un `.bin` local; `null` si se cancela. */
    pickCustomFile: () => Promise<string | null>
    addCustom: (path: string, name: string) => Promise<ModelActionResult>
    onProgress: (listener: (progress: ModelProgress) => void) => () => void
    /** Avisa cuando cambia la lista (empieza o termina una descarga, se borra o añade uno). */
    onChanged: (listener: () => void) => () => void
  }
  media: {
    /**
     * "Abrir archivo": diálogo con selección múltiple. Un archivo se registra en la lista
     * blanca de `media://` y se analiza; varios van a la cola. `null` si se cancela. Los
     * nombres de los filtros llegan traducidos desde el renderer.
     */
    openFiles: (filterLabels: Record<MediaFilterKey, string>) => Promise<OpenFilesResult | null>
    /** Avisa cuando avanza, termina o falla la vista previa de un medio, o se vacía la caché. */
    onPreview: (listener: (event: MediaPreviewEvent) => void) => () => void
    /** Borra todas las vistas previas ("Borrar historial" y "Vaciar caché"). */
    clearPreviewCache: () => Promise<void>
    /** Bytes que ocupa la caché de vistas previas. */
    getPreviewCacheSize: () => Promise<number>
  }
  history: {
    /** Crea una entrada `pending` en `userData/history/`. */
    create: (input: HistoryEntryInput) => Promise<HistoryEntry>
    /** Entradas de la más nueva a la más vieja. */
    list: () => Promise<HistoryEntry[]>
    /**
     * Entrada con sus segmentos. Si el archivo original existe lo registra en `media://`; si
     * no, `media` es `null`. `null` si la entrada no existe.
     */
    get: (id: string) => Promise<HistoryOpened | null>
    /** Ids de las entradas cuya transcripción contiene el texto (sin mayúsculas ni tildes). */
    search: (query: string) => Promise<string[]>
    /** Cambia solo el nombre mostrado; vacío lo restaura al nombre del archivo. */
    rename: (id: string, displayName: string) => Promise<HistoryEntry | null>
    /** Quita la entrada y su transcripción; el archivo original no se toca. */
    remove: (id: string) => Promise<boolean>
    /**
     * Borra todo el historial y la caché de vistas previas. Nunca toca los medios originales
     * ni los .srt exportados.
     */
    clear: () => Promise<void>
    /**
     * "Buscar archivo...": diálogo para elegir el archivo movido; apunta la entrada a él.
     * `null` si se cancela o la entrada no existe.
     */
    relocate: (
      id: string,
      filterLabels: Record<MediaFilterKey, string>
    ) => Promise<{ entry: HistoryEntry; media: OpenedMedia } | null>
    /** Abre el Explorador con el archivo original seleccionado. */
    showInFolder: (id: string) => Promise<void>
    /** Vuelve a encolar el archivo con los ajustes actuales; `false` si no se pudo. */
    retranscribe: (id: string) => Promise<boolean>
    /**
     * Cambia el texto de un segmento (edición en línea). Guarda el de whisper en
     * `originalText`; pasar ese mismo texto lo restaura. `null` si la entrada no está en disco.
     */
    updateSegment: (id: string, index: number, text: string) => Promise<Segment | null>
    /** Avisa de las entradas que crea el main (la cola, al empezar cada trabajo). */
    onAdded: (listener: (entry: HistoryEntry) => void) => () => void
  }
  export: {
    /**
     * "Guardar como" con el nombre del archivo y la extensión del formato; escribe en UTF-8
     * los segmentos que se ven (con las ediciones). `null` si se cancela.
     */
    save: (
      entryId: string,
      format: ExportFormat,
      segments: Segment[],
      options: ExportOptions,
      filterLabel: string
    ) => Promise<ExportSaved | null>
    /**
     * `<archivo>.<idioma>.srt` junto al original (Jellyfin, Plex). Sin `overwrite` no pisa
     * uno que ya exista: devuelve `exists` para que el renderer pregunte.
     */
    saveSrtBeside: (
      entryId: string,
      segments: Segment[],
      overwrite: boolean
    ) => Promise<SaveSrtBesideResult>
    /** Abre el Explorador con un archivo exportado en esta sesión seleccionado. */
    showInFolder: (path: string) => Promise<void>
  }
  queue: {
    getState: () => Promise<QueueState>
    /**
     * Diálogo con selección múltiple; lo elegido va a la cola con el modelo, idioma y
     * traducción actuales. Los nombres de los filtros llegan traducidos.
     */
    pickFiles: (filterLabels: Record<MediaFilterKey, string>) => Promise<QueueAddResult>
    /**
     * Drag & drop: encola los archivos y carpetas soltados (las carpetas se recorren con sus
     * subcarpetas y se filtran por extensión). Las rutas se sacan en el preload.
     */
    addDropped: (files: File[]) => Promise<QueueAddResult>
    /** Archivos que llegaron por "Abrir con" con la app ya abierta. */
    onFilesReceived: (listener: (result: QueueAddResult) => void) => () => void
    /** Quita un trabajo que no se está procesando. */
    remove: (id: string) => Promise<void>
    /** Nuevo orden (ids); los que falten quedan al final. */
    reorder: (ids: string[]) => Promise<void>
    /** Deja de tomar trabajos; el que está en proceso termina. */
    pause: () => Promise<void>
    /** Reanuda, y es el "Retomar" del arranque. */
    resume: () => Promise<void>
    /** "Descartar" del arranque: quita los pendientes de la sesión anterior. */
    discard: () => Promise<void>
    cancelCurrent: () => Promise<void>
    clearCompleted: () => Promise<void>
    /**
     * Registra el archivo del trabajo en `media://` y devuelve su entrada del historial,
     * para abrir su vista. `null` si el trabajo aún no tiene entrada.
     */
    openJob: (id: string) => Promise<{ entry: HistoryEntry; media: OpenedMedia } | null>
    onChanged: (listener: (state: QueueState) => void) => () => void
    /** La cola se vació tras procesar al menos un trabajo. */
    onDrained: (listener: (event: QueueDrainedEvent) => void) => () => void
  }
  transcribe: {
    /** Arranca el trabajo; el resultado llega por `onSegment`/`onProgress`/`onDone`/`onError`. */
    start: (job: TranscribeJob) => Promise<void>
    /** Mata whisper-cli y limpia los temporales del trabajo. */
    cancel: (jobId: string) => Promise<void>
    onSegment: (listener: (event: TranscribeSegmentEvent) => void) => () => void
    onProgress: (listener: (event: TranscribeProgressEvent) => void) => () => void
    onDone: (listener: (event: TranscribeDoneEvent) => void) => () => void
    onError: (listener: (event: TranscribeErrorEvent) => void) => () => void
  }
}
