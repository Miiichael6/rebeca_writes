import { availableParallelism } from 'os'
import { join } from 'path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { APP_ID, APP_NAME } from '@shared/app'
import { IpcChannel } from '@shared/ipc'
import { BackendService } from './application/backendService'
import { CudaService } from './application/cudaService'
import { ExportService } from './application/exportService'
import { HistoryService } from './application/historyService'
import { LiveControl } from './application/liveControl'
import { MediaOpener } from './application/mediaOpener'
import { ModelService } from './application/modelService'
import { PipelineChunkTranscriber } from './application/pipelineChunkTranscriber'
import { PreviewService } from './application/previewService'
import { QueueIntake } from './application/queueIntake'
import { QueueJobRunner } from './application/queueJobRunner'
import { QueueService } from './application/queueService'
import { TranscriptionManager } from './application/transcriptionManager'
import { TranscriptionPipeline } from './application/transcriptionPipeline'
import { UpdateService } from './application/updateService'
import { MediaRegistry } from './domain/mediaRegistry'
import { whisperBinaries } from './infrastructure/binaries/whisperBinaries'
import { zipCudaInstaller } from './infrastructure/downloads/zipCudaInstaller'
import { createArgvHandler } from './application/argvHandler'
import { electronDialogs } from './infrastructure/electron/electronDialogs'
import { electronShell } from './infrastructure/electron/electronShell'
import { createElectronUpdater } from './infrastructure/electron/electronUpdater'
import { MainWindow } from './infrastructure/electron/mainWindow'
import { handleMediaProtocol, registerMediaScheme } from './infrastructure/electron/mediaProtocol'
import { netDownloader } from './infrastructure/electron/netDownloader'
import { windowPublisher } from './infrastructure/electron/windowPublisher'
import { ffmpegMediaTools } from './infrastructure/ffmpeg/ffmpegTools'
import { PreviewCache } from './infrastructure/ffmpeg/previewCache'
import { nodeDisk } from './infrastructure/fs/nodeDisk'
import { fsPathExpander } from './infrastructure/fs/expandPaths'
import { createTempWorkspace } from './infrastructure/fs/tempWorkspace'
import { createFsPcmFiles } from './infrastructure/live/fsPcmFiles'
import { createHistoryMedia } from './infrastructure/media/historyMediaAdapter'
import { flushAllWrites, hasPendingWrites } from './infrastructure/persistence/fsAtomic'
import { JsonHistoryRepository } from './infrastructure/persistence/jsonHistoryRepository'
import { createJsonModelStore } from './infrastructure/persistence/jsonModelStore'
import { JsonQueueRepository } from './infrastructure/persistence/jsonQueueRepository'
import { JsonSettingsRepository } from './infrastructure/persistence/jsonSettingsRepository'
import { whisperCli } from './infrastructure/whisper/whisperCli'
import { registerIpcHandlers } from './ipc'
import { setupLogging } from './infrastructure/electron/logging'
import { watchNativeTheme } from './infrastructure/electron/theme'

app.setName(APP_NAME)
// Instancia única (spec §6): una segunda instancia le pasa su argv a esta y se cierra. Va
// después de `setName` porque el lock vive en la carpeta `userData`, que sale del nombre.
const primary = app.requestSingleInstanceLock()
if (!primary) app.quit()
setupLogging()
registerMediaScheme()

// --- Composición: todas las instancias de main se crean aquí y solo aquí. ---

const userData = app.getPath('userData')
/** `resources/bin`: en producción los binarios quedan fuera del asar (`asarUnpack: resources/**`). */
const bundledBinDir = app.isPackaged
  ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin')
  : join(app.getAppPath(), 'resources', 'bin')
/** Backends descargados desde la app (CUDA, tarea 23.1): `userData/backends/<backend>`. */
const downloadedBinDir = join(userData, 'backends')

const publisher = windowPublisher

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

const binaries = whisperBinaries([bundledBinDir, downloadedBinDir])
const temp = createTempWorkspace(join(app.getPath('temp'), APP_NAME.toLowerCase()))

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

const registry = new MediaRegistry()
const previewCache = new PreviewCache({
  dir: join(userData, 'preview-cache'),
  // `previewCacheMaxGB` ya viene validado (> 0) desde settings.
  maxBytes: async () => (await settings.load()).previewCacheMaxGB * 1024 ** 3
})
const previews = new PreviewService(previewCache, registry, publisher, log)
const opener = new MediaOpener(registry, ffmpegMediaTools, previews, electronDialogs, log)

const pipelineDeps = {
  media: ffmpegMediaTools,
  temp,
  whisper: whisperCli,
  binaries,
  backends,
  models,
  log
}
const manager = new TranscriptionManager({
  engine: new TranscriptionPipeline(pipelineDeps),
  history,
  publisher,
  log
})
// La transcripción en vivo tiene su propio pipeline: sus eventos no llegan al renderer tal cual.
const liveChunks = new PipelineChunkTranscriber(new TranscriptionPipeline(pipelineDeps))

const exporter = new ExportService({
  history,
  disk: nodeDisk,
  dialogs: electronDialogs,
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

const live = new LiveControl(
  {
    history,
    publisher,
    log,
    settings: () => settings.get(),
    hold: (id) => manager.hold(id),
    chunks: liveChunks,
    files: createFsPcmFiles(temp.dir),
    mediaDuration: async (path) =>
      (await ffmpegMediaTools.probe(path).catch(() => null))?.durationSec ?? null,
    currentBackend: async () => (await backends.info()).backend
  },
  intake
)

const updates = new UpdateService({
  updater: createElectronUpdater(),
  settings,
  disk: nodeDisk,
  publisher,
  log,
  dataDir: userData,
  busy: () => ({ transcribing: manager.isTranscribing(), cudaJob: cuda.isBusy() })
})

const mainWindow = new MainWindow(settings, log)
const queueFromArgv = createArgvHandler({
  live,
  intake,
  log,
  packaged: app.isPackaged,
  appPath: app.getAppPath()
})

app.on('second-instance', (_event, argv, workingDirectory) => {
  mainWindow.focus()
  void queueFromArgv(argv, workingDirectory).then((result) => {
    if (result) mainWindow.current()?.webContents.send(IpcChannel.QueueFilesReceived, result)
  })
})

app.whenReady().then(async () => {
  if (!primary) return
  electronApp.setAppUserModelId(APP_ID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Antes de la ventana: de aquí salen el tema y el tamaño con que se abre.
  const loaded = await settings.load().catch((err) => {
    log.error('No se pudo leer settings.json; se usan los valores por defecto', err)
    return null
  })
  if (loaded) nativeTheme.themeSource = loaded.theme
  // Cambiar themeSource dispara nativeTheme 'updated' → watchNativeTheme recolorea la ventana.
  settings.onChanged(({ theme }) => {
    if (nativeTheme.themeSource !== theme) nativeTheme.themeSource = theme
  })

  handleMediaProtocol((id) => registry.resolve(id))
  registerIpcHandlers({
    settings,
    backends,
    cuda,
    models,
    previews,
    opener,
    history: new HistoryService(
      history,
      createHistoryMedia({
        registry,
        opener,
        previews,
        disk: nodeDisk,
        shell: electronShell
      })
    ),
    exporter,
    queue,
    intake,
    manager,
    live,
    updates
  })
  queue.init().catch((err) => log.error('No se pudo leer la cola', err))
  watchNativeTheme()
  // Autodetección del backend en segundo plano; la ventana no la espera.
  backends.info().catch((err) => log.error('No se pudo resolver el backend', err))

  mainWindow.create()
  updates.scheduleAutoCheck()
  // Arranque en frío con archivos ("Abrir con"). Si la cola pregunta si retomar, esperan a
  // la respuesta y "Descartar" no los quita.
  void queueFromArgv(process.argv, process.cwd())

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) mainWindow.create()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('will-quit', () => {
  previews.dispose()
  manager.cancelAll()
  live.stop()
})

// Settings, historial y cola se guardan con debounce: al salir se escribe lo pendiente.
let writesFlushed = false
app.on('before-quit', (event) => {
  queue.shutdown()
  if (writesFlushed || !hasPendingWrites()) return
  event.preventDefault()
  flushAllWrites()
    .catch((err) => log.error('No se pudieron guardar los datos al salir', err))
    .finally(() => {
      writesFlushed = true
      app.quit()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
