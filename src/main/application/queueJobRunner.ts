import { dirname } from 'path'
import { hasSiblingSrt, srtLanguage } from '@shared/exporters'
import { IpcChannel } from '@shared/ipc'
import { transcribeOptionsFrom } from '@shared/settings'
import type { HistoryEntry, QueueJob, Segment } from '@shared/types'
import type { ExportService } from './exportService'
import type { Disk } from './ports/disk'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { HistoryRepository } from './ports/historyRepository'
import type { MediaTools } from './ports/mediaTools'
import type { QueueRunner, RunHooks, RunOutcome } from './ports/queueRunner'
import type { SettingsRepository } from './ports/settingsRepository'
import type { TranscriptionManager } from './transcriptionManager'

export interface QueueJobRunnerDeps {
  manager: TranscriptionManager
  history: HistoryRepository
  media: Pick<MediaTools, 'probe'>
  exporter: ExportService
  settings: SettingsRepository
  disk: Disk
  publisher: EventPublisher
  log: Logger
}

/** Transcribe los trabajos de la cola con el `TranscriptionManager` y deja su historial y su `.srt`. */
export class QueueJobRunner implements QueueRunner {
  /** Progreso de los trabajos de la cola en marcha, por id. */
  private readonly progressHooks = new Map<string, RunHooks['onProgress']>()

  constructor(private readonly deps: QueueJobRunnerDeps) {
    deps.manager.onProgress((jobId, percent) => this.progressHooks.get(jobId)?.(percent))
  }

  async run(job: QueueJob, hooks: RunHooks): Promise<RunOutcome> {
    const { manager, settings } = this.deps
    const entry = await this.historyEntryFor(job)
    hooks.onHistory(entry.id)
    this.progressHooks.set(job.id, hooks.onProgress)
    try {
      const result = await manager.run({
        id: job.id,
        filePath: job.filePath,
        model: job.model,
        language: job.language,
        translate: job.translate,
        audioTrack: job.audioTrack,
        historyId: entry.id,
        options: transcribeOptionsFrom(settings.get())
      })
      if (!result.ok) {
        return result.event.code === 'cancelled'
          ? { status: 'cancelled' }
          : { status: 'error', error: result.event.code }
      }
      if (settings.get().queue.autoSaveSrt) {
        await this.saveSrtBeside(job, result.event.segments, result.event.language)
      }
      return { status: 'done' }
    } finally {
      this.progressHooks.delete(job.id)
    }
  }

  cancel(jobId: string): void {
    this.deps.manager.cancel(jobId)
  }

  waitIdle(): Promise<void> {
    return this.deps.manager.waitIdle()
  }

  async shouldSkip(job: QueueJob): Promise<boolean> {
    if (!this.deps.settings.get().queue.skipExistingSrt) return false
    return hasSiblingSrt(job.fileName, await this.deps.disk.listDir(dirname(job.filePath)))
  }

  /**
   * Entrada del historial del trabajo: la misma si se retoma, o una nueva. Se avisa al
   * renderer en los dos casos para que la muestre en la barra lateral.
   */
  private async historyEntryFor(job: QueueJob): Promise<HistoryEntry> {
    const { history, media, publisher } = this.deps
    const existing = job.historyId ? await history.get(job.historyId) : null
    const entry =
      existing?.entry ??
      (await history.create({
        filePath: job.filePath,
        fileName: job.fileName,
        durationSec: (await media.probe(job.filePath).catch(() => null))?.durationSec ?? 0,
        model: job.model,
        language: job.language
      }))
    publisher.publish(IpcChannel.HistoryAdded, entry)
    return entry
  }

  /**
   * `<archivo>.<idioma>.srt` junto al original (opción "guardar el .srt al terminar"). Pisa
   * el que hubiera con ese nombre: la opción es automática y no puede preguntar.
   */
  private async saveSrtBeside(job: QueueJob, segments: Segment[], language: string): Promise<void> {
    // `language` ya es el detectado si el trabajo pidió `auto`.
    const lang = srtLanguage({ language, translate: job.translate })
    try {
      await this.deps.exporter.writeSrtBeside(job.filePath, lang, segments, true)
    } catch (err) {
      this.deps.log.error(`Cola: no se pudo guardar el .srt de ${job.filePath}`, err)
    }
  }
}
