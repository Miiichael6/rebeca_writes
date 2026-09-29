import { existsSync } from 'fs'
import { mkdir, rm, unlink } from 'fs/promises'
import { join } from 'path'
import { BrowserWindow, net } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type {
  CudaActionResult,
  CudaDownloadResult,
  CudaErrorCode,
  CudaPackageStatus,
  CudaProgress
} from '@shared/types'
import { CUDA_PACKAGE } from '@shared/whisper'
import { isBackendInUse, probeBackend, resetDetection } from '../engine/backend'
import { binRoot, downloadedBinRoot, installedBackends } from '../engine/paths'
import { updateSettings } from './settings'
import { CudaInstallError, installFromZip } from './cudaInstall'
import {
  DownloadError,
  downloadWithResume,
  fileSize,
  freeDiskSpace,
  partPath
} from './modelDownload'

/** Lo que ocupa CUDA descomprimido (~1,1 GB) más margen; hace falta a la vez que el zip. */
const EXTRACTED_BYTES = 1300 * 1024 * 1024
const DISK_MARGIN_BYTES = 100 * 1024 * 1024

interface Job {
  controller: AbortController
  promise: Promise<CudaDownloadResult>
  phase: CudaProgress['phase']
}

let job: Job | null = null

function cudaDir(): string {
  return join(downloadedBinRoot(), 'cuda')
}

function zipPath(): string {
  return join(downloadedBinRoot(), 'cuda.zip')
}

function sendProgress(progress: CudaProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.BackendCudaProgress, progress)
  }
}

function notifyChanged(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.BackendChanged)
  }
}

/** Hay una descarga o instalación de CUDA en curso. */
export function isCudaBusy(): boolean {
  return job !== null
}

export async function cudaPackageStatus(): Promise<CudaPackageStatus> {
  const removable = existsSync(join(cudaDir(), 'whisper-cli.exe'))
  const state = job
    ? job.phase
    : removable || installedBackends().includes('cuda')
      ? 'installed'
      : 'missing'
  return {
    state,
    partBytes: job?.phase === 'installing' ? 0 : await fileSize(partPath(zipPath())),
    sizeBytes: CUDA_PACKAGE.sizeBytes,
    removable: removable && !job
  }
}

/** Descarga (o reanuda) el paquete CUDA, lo valida y lo instala. Una sola a la vez. */
export function downloadCudaPackage(): Promise<CudaDownloadResult> {
  if (job) return job.promise

  const controller = new AbortController()
  const current: Job = {
    controller,
    phase: 'downloading',
    promise: Promise.resolve({ status: 'done' })
  }
  current.promise = runDownload(current).finally(() => {
    job = null
    notifyChanged()
  })
  job = current
  notifyChanged()
  return current.promise
}

function errorCode(err: unknown): CudaErrorCode {
  if (err instanceof DownloadError || err instanceof CudaInstallError) return err.code
  if ((err as NodeJS.ErrnoException).code === 'ENOSPC') return 'noDiskSpace'
  return 'cudaInvalid'
}

async function runDownload(current: Job): Promise<CudaDownloadResult> {
  const { signal } = current.controller
  const dir = downloadedBinRoot()
  const zip = zipPath()

  try {
    await mkdir(dir, { recursive: true })
    const remaining = CUDA_PACKAGE.sizeBytes - (await fileSize(partPath(zip)))
    if ((await freeDiskSpace(dir)) < remaining + EXTRACTED_BYTES + DISK_MARGIN_BYTES) {
      return { status: 'error', code: 'noDiskSpace' }
    }

    log.info(`Descargando CUDA ${CUDA_PACKAGE.url} → ${zip}`)
    await downloadWithResume({
      url: CUDA_PACKAGE.url,
      dest: zip,
      expectedSize: CUDA_PACKAGE.sizeBytes,
      signal,
      // net.fetch usa la red de Chromium: respeta el proxy del sistema.
      fetch: (url, init) => net.fetch(url, init),
      onProgress: (p) => sendProgress({ phase: 'downloading', ...p })
    })

    // A partir de aquí ya no se puede cancelar: son unos segundos y deja todo en su sitio.
    current.phase = 'installing'
    notifyChanged()
    sendProgress({ phase: 'installing', received: 0, total: 0, bytesPerSec: 0, etaSec: null })
    log.info('CUDA descargado; verificando, extrayendo y validando')
    await installFromZip({
      zip,
      target: cudaDir(),
      sha256: CUDA_PACKAGE.sha256,
      vcRuntimeDir: join(binRoot(), 'cpu'),
      validate: (cli) => probeBackend('cuda', cli)
    })
    log.info(`CUDA instalado en ${cudaDir()}`)

    // El usuario lo descargó para usarlo: pasa a ser el elegido.
    await updateSettings({ backend: 'cuda' })
    await resetDetection()
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

/** Cancela la descarga; el `.part` se conserva para reanudar. */
export function cancelCudaDownload(): void {
  if (job?.phase === 'downloading') job.controller.abort()
}

/**
 * Borra el paquete descargado (y un `.part` a medias) y vuelve a detectar: la app sigue con
 * Vulkan o CPU sin reiniciar. No se puede mientras una transcripción lo use.
 */
export async function removeCudaPackage(): Promise<CudaActionResult> {
  if (isBackendInUse('cuda') || job?.phase === 'installing') {
    return { ok: false, code: 'backendInUse' }
  }
  if (job) {
    job.controller.abort()
    await job.promise
  }
  await rm(cudaDir(), { recursive: true, force: true })
  await unlink(partPath(zipPath())).catch(() => {})
  log.info('Paquete CUDA eliminado')
  await resetDetection()
  return { ok: true }
}
