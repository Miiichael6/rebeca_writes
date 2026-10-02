import { join } from 'path'
import type { ModelDownloadResult } from '@shared/models'
import { DownloadError, partPath } from '../domain/downloads'
import type { Disk } from './ports/disk'
import type { Logger } from './ports/eventPublisher'
import type { FileDownloader } from './ports/fileDownloader'

/**
 * El modelo de huellas de voz (tarea 35, D13): CAM++ de 3D-Speaker para sherpa-onnx, entrenado
 * con chino e inglés pero independiente del idioma. Se descarga la primera vez que hace falta,
 * igual que los modelos de whisper (con reanudación), a `userData/models/speakers`.
 */
export const SPEAKER_MODEL = {
  file: '3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
  url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
  sizeBytes: 28_281_164
} as const

/** Margen libre que se deja en el disco además del modelo. */
const DISK_MARGIN_BYTES = 50 * 1024 * 1024

export interface SpeakerModelDeps {
  /** Carpeta del modelo. */
  dir: string
  disk: Disk
  downloader: FileDownloader
  log: Logger
}

export class SpeakerModel {
  private download: Promise<ModelDownloadResult> | null = null

  constructor(private readonly deps: SpeakerModelDeps) {}

  private get path(): string {
    return join(this.deps.dir, SPEAKER_MODEL.file)
  }

  /** Ruta del modelo si ya está entero en disco; si no, `null`. */
  async readyPath(): Promise<string | null> {
    if (this.download) return null
    const size = await this.deps.disk.fileSize(this.path)
    return size === SPEAKER_MODEL.sizeBytes ? this.path : null
  }

  /** Lo descarga si falta. Dos llamadas a la vez comparten la misma descarga. */
  prepare(): Promise<ModelDownloadResult> {
    this.download ??= this.run().finally(() => (this.download = null))
    return this.download
  }

  private async run(): Promise<ModelDownloadResult> {
    const { dir, disk, downloader, log } = this.deps
    const dest = this.path
    if ((await disk.fileSize(dest)) === SPEAKER_MODEL.sizeBytes) return { status: 'done' }
    try {
      await disk.ensureDir(dir)
      const remaining = SPEAKER_MODEL.sizeBytes - (await disk.fileSize(partPath(dest)))
      if ((await disk.freeSpace(dir)) < remaining + DISK_MARGIN_BYTES) {
        return { status: 'error', code: 'noDiskSpace' }
      }
      log.info(`Hablantes: descargando el modelo de voces → ${dest}`)
      await downloader.download({
        url: SPEAKER_MODEL.url,
        dest,
        expectedSize: SPEAKER_MODEL.sizeBytes,
        signal: new AbortController().signal,
        onProgress: () => {}
      })
      log.info('Hablantes: modelo de voces descargado')
      return { status: 'done' }
    } catch (err) {
      log.error('Hablantes: falló la descarga del modelo de voces', err)
      if (err instanceof DownloadError) return { status: 'error', code: err.code }
      return { status: 'error', code: 'downloadFailed' }
    }
  }
}
