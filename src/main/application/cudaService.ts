import { join } from 'path'
import { IpcChannel } from '@shared/ipc'
import type {
  CudaActionResult,
  CudaDownloadResult,
  CudaErrorCode,
  CudaPackageStatus,
  CudaProgress
} from '@shared/types'
import { CUDA_PACKAGE } from '@shared/whisper'
import { CudaInstallError, DownloadError, partPath } from '../domain/downloads'
import type { BackendService } from './backendService'
import type { BackendBinaries } from './ports/backendBinaries'
import type { CudaInstaller } from './ports/cudaInstaller'
import type { Disk } from './ports/disk'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { FileDownloader } from './ports/fileDownloader'
import type { SettingsRepository } from './ports/settingsRepository'

/** Lo que ocupa CUDA descomprimido (~1,1 GB) más margen; hace falta a la vez que el zip. */
const EXTRACTED_BYTES = 1300 * 1024 * 1024
const DISK_MARGIN_BYTES = 100 * 1024 * 1024

export interface CudaServiceDeps {
  backends: BackendService
  binaries: BackendBinaries
  settings: SettingsRepository
  disk: Disk
  downloader: FileDownloader
  installer: CudaInstaller
  publisher: EventPublisher
  log: Logger
  /** Carpeta de los backends descargados desde la app (`userData/backends`). */
  downloadedRoot: string
  /** Carpeta del backend CPU que trae la app, de donde sale el runtime de Visual C++. */
  cpuBinDir: string
}

interface Job {
  controller: AbortController
  promise: Promise<CudaDownloadResult>
  phase: CudaProgress['phase']
}

function errorCode(err: unknown): CudaErrorCode {
  if (err instanceof DownloadError || err instanceof CudaInstallError) return err.code
  if ((err as NodeJS.ErrnoException).code === 'ENOSPC') return 'noDiskSpace'
  return 'cudaInvalid'
}

/** Paquete CUDA descargable (tarea 23.1): estado, descarga, instalación y borrado. */
export class CudaService {
  private job: Job | null = null

  constructor(private readonly deps: CudaServiceDeps) {}

  /** Hay una descarga o instalación de CUDA en curso. */
  isBusy(): boolean {
    return this.job !== null
  }

  async status(): Promise<CudaPackageStatus> {
    const { disk, binaries } = this.deps
    const removable = await disk.exists(join(this.cudaDir, 'whisper-cli.exe'))
    const { job } = this
    const state = job
      ? job.phase
      : removable || binaries.installed().includes('cuda')
        ? 'installed'
        : 'missing'
    return {
      state,
      partBytes: job?.phase === 'installing' ? 0 : await disk.fileSize(partPath(this.zipPath)),
      sizeBytes: CUDA_PACKAGE.sizeBytes,
      removable: removable && !job
    }
  }

  /** Descarga (o reanuda) el paquete CUDA, lo valida y lo instala. Una sola a la vez. */
  download(): Promise<CudaDownloadResult> {
    if (this.job) return this.job.promise

    const current: Job = {
      controller: new AbortController(),
      phase: 'downloading',
      promise: Promise.resolve({ status: 'done' })
    }
    current.promise = this.runDownload(current).finally(() => {
      this.job = null
      this.deps.backends.notifyChanged()
    })
    this.job = current
    this.deps.backends.notifyChanged()
    return current.promise
  }

  /** Cancela la descarga; el `.part` se conserva para reanudar. */
  cancel(): void {
    if (this.job?.phase === 'downloading') this.job.controller.abort()
  }

  /**
   * Borra el paquete descargado (y un `.part` a medias) y vuelve a detectar: la app sigue con
   * Vulkan o CPU sin reiniciar. No se puede mientras una transcripción lo use.
   */
  async remove(): Promise<CudaActionResult> {
    const { backends, disk, log } = this.deps
    if (backends.isInUse('cuda') || this.job?.phase === 'installing') {
      return { ok: false, code: 'backendInUse' }
    }
    if (this.job) {
      this.job.controller.abort()
      await this.job.promise
    }
    await disk.remove(this.cudaDir)
    await disk.remove(partPath(this.zipPath))
    log.info('Paquete CUDA eliminado')
    await backends.reset()
    return { ok: true }
  }

  private get cudaDir(): string {
    return join(this.deps.downloadedRoot, 'cuda')
  }

  private get zipPath(): string {
    return join(this.deps.downloadedRoot, 'cuda.zip')
  }

  private sendProgress(progress: CudaProgress): void {
    this.deps.publisher.publish(IpcChannel.BackendCudaProgress, progress)
  }

  private async runDownload(current: Job): Promise<CudaDownloadResult> {
    const { backends, binaries, settings, disk, downloader, installer, log } = this.deps
    const { signal } = current.controller
    const dir = this.deps.downloadedRoot
    const zip = this.zipPath

    try {
      await disk.ensureDir(dir)
      const remaining = CUDA_PACKAGE.sizeBytes - (await disk.fileSize(partPath(zip)))
      if ((await disk.freeSpace(dir)) < remaining + EXTRACTED_BYTES + DISK_MARGIN_BYTES) {
        return { status: 'error', code: 'noDiskSpace' }
      }

      log.info(`Descargando CUDA ${CUDA_PACKAGE.url} → ${zip}`)
      await downloader.download({
        url: CUDA_PACKAGE.url,
        dest: zip,
        expectedSize: CUDA_PACKAGE.sizeBytes,
        signal,
        onProgress: (p) => this.sendProgress({ phase: 'downloading', ...p })
      })

      // A partir de aquí ya no se puede cancelar: son unos segundos y deja todo en su sitio.
      current.phase = 'installing'
      backends.notifyChanged()
      this.sendProgress({
        phase: 'installing',
        received: 0,
        total: 0,
        bytesPerSec: 0,
        etaSec: null
      })
      log.info('CUDA descargado; verificando, extrayendo y validando')
      await installer.install({
        zip,
        target: this.cudaDir,
        sha256: CUDA_PACKAGE.sha256,
        vcRuntimeDir: this.deps.cpuBinDir,
        validate: (cli) => binaries.probe('cuda', cli)
      })
      log.info(`CUDA instalado en ${this.cudaDir}`)

      // El usuario lo descargó para usarlo: pasa a ser el elegido.
      await settings.update({ backend: 'cuda' })
      await backends.reset()
      return { status: 'done' }
    } catch (err) {
      if (signal.aborted) {
        log.info('Descarga de CUDA cancelada')
        return { status: 'cancelled' }
      }
      log.error('Falló la descarga o instalación de CUDA', err)
      return { status: 'error', code: errorCode(err) }
    }
  }
}
