import { join } from 'path'
import type { ModelDownloadResult } from '@shared/models'
import { DownloadError, partPath } from '../domain/downloads'
import type { Disk } from './ports/disk'
import type { Logger } from './ports/eventPublisher'
import type { FileDownloader } from './ports/fileDownloader'

/** Un modelo de un solo archivo que se descarga de una URL fija. */
export interface SingleFileModelSpec {
  file: string
  url: string
  sizeBytes: number
  /** Nombre en los logs ("modelo de voces"). */
  label: string
}

/**
 * El modelo de huellas de voz (tarea 35, D13): CAM++ de 3D-Speaker para sherpa-onnx, entrenado
 * con chino e inglés pero independiente del idioma.
 */
export const SPEAKER_MODEL: SingleFileModelSpec = {
  file: '3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
  url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
  sizeBytes: 28_281_164,
  label: 'modelo de voces'
}

/** El filtro de voz de whisper (tarea 36): Silero VAD convertido a ggml. */
export const VAD_MODEL: SingleFileModelSpec = {
  file: 'ggml-silero-v6.2.0.bin',
  url: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin',
  sizeBytes: 885_098,
  label: 'filtro de voz'
}

/** Margen libre que se deja en el disco además del modelo. */
const DISK_MARGIN_BYTES = 50 * 1024 * 1024

export interface SingleFileModelDeps {
  /** Carpeta del modelo. */
  dir: string
  disk: Disk
  downloader: FileDownloader
  log: Logger
}

/**
 * Un modelo auxiliar (voces, filtro de voz) que se descarga la primera vez que hace falta,
 * igual que los modelos de whisper (con reanudación), a su carpeta de `userData/models`.
 */
export class SingleFileModel {
  private download: Promise<ModelDownloadResult> | null = null

  constructor(
    private readonly spec: SingleFileModelSpec,
    private readonly deps: SingleFileModelDeps
  ) {}

  private get path(): string {
    return join(this.deps.dir, this.spec.file)
  }

  /** Ruta del modelo si ya está entero en disco; si no, `null`. */
  async readyPath(): Promise<string | null> {
    if (this.download) return null
    const size = await this.deps.disk.fileSize(this.path)
    return size === this.spec.sizeBytes ? this.path : null
  }

  /** Lo descarga si falta. Dos llamadas a la vez comparten la misma descarga. */
  prepare(): Promise<ModelDownloadResult> {
    this.download ??= this.run().finally(() => (this.download = null))
    return this.download
  }

  private async run(): Promise<ModelDownloadResult> {
    const { dir, disk, downloader, log } = this.deps
    const { url, sizeBytes, label } = this.spec
    const dest = this.path
    if ((await disk.fileSize(dest)) === sizeBytes) return { status: 'done' }
    try {
      await disk.ensureDir(dir)
      const remaining = sizeBytes - (await disk.fileSize(partPath(dest)))
      if ((await disk.freeSpace(dir)) < remaining + DISK_MARGIN_BYTES) {
        return { status: 'error', code: 'noDiskSpace' }
      }
      log.info(`Descargando el ${label} → ${dest}`)
      await downloader.download({
        url,
        dest,
        expectedSize: sizeBytes,
        signal: new AbortController().signal,
        onProgress: () => {}
      })
      log.info(`${label}: descargado`)
      return { status: 'done' }
    } catch (err) {
      log.error(`Falló la descarga del ${label}`, err)
      if (err instanceof DownloadError) return { status: 'error', code: err.code }
      return { status: 'error', code: 'downloadFailed' }
    }
  }
}
