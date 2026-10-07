import { availableParallelism } from 'os'
import { join } from 'path'
import log from 'electron-log/main'
import type { QueueAddResult } from '@shared/types'
import { IpcChannel } from '@shared/ipc'
import { createArgvHandler } from './application/argvHandler'
import { BackendService } from './application/backendService'
import { CudaService } from './application/cudaService'
import { Dock } from './application/dock'
import { DockMenu } from './application/dockMenu'
import { ExportService } from './application/exportService'
import { HistoryService } from './application/historyService'
import { LiveControl } from './application/liveControl'
import { MediaOpener } from './application/mediaOpener'
import { MeetingSuggester } from './application/meetingSuggester'
import { MicRecording } from './application/micRecording'
import { ModelService } from './application/modelService'
import { PipelineChunkTranscriber } from './application/pipelineChunkTranscriber'
import { PreviewQueue } from './application/previewQueue'
import { PreviewService } from './application/previewService'
import { QueueIntake } from './application/queueIntake'
import { QueueJobRunner } from './application/queueJobRunner'
import { QueueService } from './application/queueService'
import { RecordHotkey } from './application/recordHotkey'
import { RecordingsFolder } from './application/recordingsFolder'
import { SingleFileModel, SPEAKER_MODEL, VAD_MODEL } from './application/singleFileModel'
import { TranscriptionManager } from './application/transcriptionManager'
import { TranscriptionPipeline } from './application/transcriptionPipeline'
import { UpdateService } from './application/updateService'
import { MediaRegistry } from './domain/mediaRegistry'
import { whisperBinaries } from './infrastructure/binaries/whisperBinaries'
import { createFsRecordingFiles } from './infrastructure/capture/fsRecordingFiles'
import { CAPTURE_BINARY, SidecarAudioCapture } from './infrastructure/capture/sidecarAudioCapture'
import { zipCudaInstaller } from './infrastructure/downloads/zipCudaInstaller'
import { ElectronDockMenuSurface } from './infrastructure/electron/dockMenuWindow'
import { ElectronDockSurface } from './infrastructure/electron/dockWindow'
import { electronDialogs } from './infrastructure/electron/electronDialogs'
import { electronShell } from './infrastructure/electron/electronShell'
import { createElectronUpdater } from './infrastructure/electron/electronUpdater'
import { netDownloader } from './infrastructure/electron/netDownloader'
import { windowPublisher as publisher } from './infrastructure/electron/windowPublisher'
import { ffmpegRecordingEncoder } from './infrastructure/ffmpeg/ffmpegRecordingEncoder'
import { ffmpegPreviewEncoder } from './infrastructure/ffmpeg/ffmpegPreviewEncoder'
import { ffmpegMediaTools } from './infrastructure/ffmpeg/ffmpegTools'
import { HOTKEY_BINARY, HotkeySidecar } from './infrastructure/hotkey/hotkeySidecar'
import { CALLS_BINARY, MicUsageSidecar } from './infrastructure/meeting/micUsageSidecar'
import { fsPathExpander } from './infrastructure/fs/expandPaths'
import { fsPreviewStore } from './infrastructure/fs/fsPreviewStore'
import { nodeDisk } from './infrastructure/fs/nodeDisk'
import { createTempWorkspace } from './infrastructure/fs/tempWorkspace'
import { createFsPcmFiles } from './infrastructure/live/fsPcmFiles'
import { createHistoryMedia } from './infrastructure/media/historyMediaAdapter'
import { JsonHistoryRepository } from './infrastructure/persistence/jsonHistoryRepository'
import { createJsonModelStore } from './infrastructure/persistence/jsonModelStore'
import { SPEAKER_BINARY, SpeakerSidecar } from './infrastructure/speakers/speakerSidecar'
import { JsonQueueRepository } from './infrastructure/persistence/jsonQueueRepository'
import { JsonSettingsRepository } from './infrastructure/persistence/jsonSettingsRepository'
import { whisperCli } from './infrastructure/whisper/whisperCli'
import type { IpcDeps } from './ipc'

/** Carpetas y datos de la app que decide Electron; `index.ts` los calcula y los pasa. */
export interface AppPaths {
  userData: string
  /** `resources/bin` con los binarios incluidos en la app. */
  bundledBinDir: string
  /** Carpeta temporal de la app (WAV de ffmpeg, ventanas en vivo). */
  tempDir: string
  appPath: string
  packaged: boolean
  /** Carpeta de grabaciones si no se eligió otra: `Documentos\RebeccaWrites\Grabaciones`. */
  defaultRecordingsDir: string
}

/** Lo que solo sabe hacer `index.ts` (la ventana principal y el ciclo de vida de la app). */
export interface AppControl {
  showMainWindow: () => void
  /** Cierra la app del todo (D9): cerrar la ventana la deja en segundo plano. */
  quit: () => void
}

export interface Services extends IpcDeps {
  registry: MediaRegistry
  meetings: MeetingSuggester
  /** Encola los archivos o atiende la orden en vivo que lleguen por la línea de órdenes. */
  queueFromArgv: (argv: readonly string[], cwd: string) => Promise<QueueAddResult | null>
}

/**
 * Raíz de composición: todas las instancias de main se crean aquí y solo aquí. Une los
 * casos de uso de `application/` con los adaptadores de `infrastructure/`.
 */
export function createServices(paths: AppPaths, control: AppControl): Services {
  const { userData, bundledBinDir } = paths
  /** Backends descargados desde la app (CUDA, tarea 23.1): `userData/backends/<backend>`. */
  const downloadedBinDir = join(userData, 'backends')

  // --- Persistencia ---
  const settings = new JsonSettingsRepository({
    path: join(userData, 'settings.json'),
    cpuCount: availableParallelism(),
    onCorrupt: (backup, err) => log.error(`settings.json corrupto; respaldado en ${backup}`, err)
  })
  settings.onChanged((next) => publisher.publish(IpcChannel.SettingsChanged, next))
  const history = new JsonHistoryRepository({
    dir: join(userData, 'history'),
    onCorrupt: (backup, err) => log.error(`Historial corrupto; respaldado en ${backup}`, err)
  })
  const queueStore = new JsonQueueRepository({
    path: join(userData, 'queue.json'),
    onCorrupt: (backup, err) => log.error(`Cola corrupta; respaldada en ${backup}`, err)
  })

  // --- Backends y modelos ---
  const binaries = whisperBinaries([bundledBinDir, downloadedBinDir])
  const temp = createTempWorkspace(paths.tempDir)
  const backends = new BackendService({ binaries, settings, publisher, log })
  const models = new ModelService({
    store: createJsonModelStore(join(userData, 'models')),
    disk: nodeDisk,
    downloader: netDownloader,
    dialogs: electronDialogs,
    publisher,
    log
  })
  const cuda = new CudaService({
    backends,
    binaries,
    settings,
    disk: nodeDisk,
    downloader: netDownloader,
    installer: zipCudaInstaller,
    publisher,
    log,
    downloadedRoot: downloadedBinDir,
    cpuBinDir: join(bundledBinDir, 'cpu')
  })

  // --- Medios y vistas previas ---
  const registry = new MediaRegistry()
  const previewQueue = new PreviewQueue({
    store: fsPreviewStore(join(userData, 'preview-cache')),
    encoder: ffmpegPreviewEncoder,
    // `previewCacheMaxGB` ya viene validado (> 0) desde settings.
    maxBytes: async () => (await settings.load()).previewCacheMaxGB * 1024 ** 3
  })
  const previews = new PreviewService(previewQueue, registry, publisher, log)
  const opener = new MediaOpener(registry, ffmpegMediaTools, previews, electronDialogs, log)

  // --- Quién habla (tarea 35) ---
  const speakerModel = new SingleFileModel(SPEAKER_MODEL, {
    dir: join(userData, 'models', 'speakers'),
    disk: nodeDisk,
    downloader: netDownloader,
    log
  })
  const speakerEmbedder = new SpeakerSidecar(join(bundledBinDir, SPEAKER_BINARY), speakerModel, log)

  // --- Transcripción ---
  const vadModel = new SingleFileModel(VAD_MODEL, {
    dir: join(userData, 'models', 'vad'),
    disk: nodeDisk,
    downloader: netDownloader,
    log
  })
  const pipelineDeps = {
    media: ffmpegMediaTools,
    temp,
    whisper: whisperCli,
    binaries,
    backends,
    models,
    vadModel,
    log
  }
  const manager = new TranscriptionManager({
    engine: new TranscriptionPipeline({
      ...pipelineDeps,
      speakers: { embedder: speakerEmbedder, enabled: () => settings.get().detectSpeakers }
    }),
    history,
    publisher,
    log
  })

  // --- Historial, exportar y cola ---
  const exporter = new ExportService({
    history,
    disk: nodeDisk,
    dialogs: electronDialogs,
    shell: electronShell
  })
  const historyMedia = createHistoryMedia({
    registry,
    opener,
    previews,
    disk: nodeDisk,
    shell: electronShell
  })
  const queue = new QueueService({
    store: queueStore,
    runner: new QueueJobRunner({
      manager,
      history,
      media: ffmpegMediaTools,
      exporter,
      settings,
      disk: nodeDisk,
      publisher,
      log
    }),
    notifier: {
      onChange: (state) => publisher.publish(IpcChannel.QueueChanged, state),
      onDrained: (event) => publisher.publish(IpcChannel.QueueDrained, event)
    }
  })
  const intake = new QueueIntake({ queue, settings, history, opener, expander: fsPathExpander })

  // --- En vivo ---
  // Tiene su propio pipeline: sus eventos no llegan al renderer tal cual.
  const live = new LiveControl(
    {
      history,
      publisher,
      log,
      settings: () => settings.get(),
      hold: (id) => manager.hold(id),
      chunks: new PipelineChunkTranscriber(new TranscriptionPipeline(pipelineDeps)),
      files: createFsPcmFiles(temp.dir),
      mediaDuration: async (path) =>
        (await ffmpegMediaTools.probe(path).catch(() => null))?.durationSec ?? null,
      currentBackend: async () => (await backends.info()).backend,
      speakers: speakerEmbedder
    },
    intake
  )

  // --- Grabar con el micrófono ---
  const recordingsFolder = new RecordingsFolder(
    settings,
    electronDialogs,
    paths.defaultRecordingsDir
  )
  const mic = new MicRecording({
    capture: new SidecarAudioCapture(join(bundledBinDir, CAPTURE_BINARY), log),
    files: createFsRecordingFiles(join(paths.tempDir, 'recordings')),
    encoder: ffmpegRecordingEncoder,
    live,
    recordingsDir: () => recordingsFolder.dir(),
    format: () => settings.get().recordingFormat,
    micId: () => settings.get().recordingMicId,
    publisher,
    log
  })

  // --- Dock en el borde (tareas 30 y 33) ---
  const dock = new Dock({
    surface: new ElectronDockSurface(() => settings.get().dockPosition),
    mic,
    source: () => settings.get().recordingSource,
    // `dockMenu` se crea justo después; solo se consulta con el dock ya fuera.
    menuOpen: () => dockMenu.isOpen(),
    quit: control.quit,
    log
  })
  mic.onStateChange(() => dock.refresh())
  let dockPosition = settings.get().dockPosition
  settings.onChanged((next) => {
    if (next.dockPosition === dockPosition) return
    dockPosition = next.dockPosition
    dock.refresh()
  })
  const dockMenu = new DockMenu({
    surface: new ElectronDockMenuSurface(() => settings.get().dockPosition),
    dock,
    mic,
    settings,
    showMainWindow: control.showMainWindow,
    log
  })

  // --- Atajo para grabar (tarea 31) ---
  const hotkey = new RecordHotkey({
    source: new HotkeySidecar(join(bundledBinDir, HOTKEY_BINARY), log),
    mic,
    dock,
    recordingSource: () => settings.get().recordingSource,
    publisher,
    log
  })
  settings.onChanged((next) => hotkey.configure(next.recordShortcut))

  // --- Sugerir grabar reuniones (tarea 32) ---
  const meetings = new MeetingSuggester({
    source: new MicUsageSidecar(join(bundledBinDir, CALLS_BINARY), log),
    mic,
    dock,
    log
  })
  settings.onChanged((next) => meetings.configure(next.suggestMeetingRecording))

  // --- Actualizaciones ---
  const updates = new UpdateService({
    updater: createElectronUpdater(),
    settings,
    disk: nodeDisk,
    publisher,
    log,
    dataDir: userData,
    busy: () => ({ transcribing: manager.isTranscribing(), cudaJob: cuda.isBusy() })
  })

  return {
    settings,
    backends,
    cuda,
    models,
    speakerModel,
    vadModel,
    previews,
    opener,
    history: new HistoryService(history, historyMedia),
    exporter,
    queue,
    intake,
    manager,
    live,
    mic,
    recordingsFolder,
    updates,
    dock,
    dockMenu,
    hotkey,
    meetings,
    showMainWindow: control.showMainWindow,
    registry,
    queueFromArgv: createArgvHandler({
      live,
      intake,
      log,
      packaged: paths.packaged,
      appPath: paths.appPath
    })
  }
}
