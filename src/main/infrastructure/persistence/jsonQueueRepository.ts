import type { QueueJob } from '@shared/types'
import type { QueueRepository } from '../../application/ports/queueRepository'
import { isQueueJob, persistedJob, restoreJob } from '../../domain/queueJob'
import { DebouncedJsonWriter, readJsonSafe } from './fsAtomic'

/** Adaptador de la cola sobre `userData/queue.json`: `{ version, jobs: QueueJob[] }`. */

const QUEUE_VERSION = 1

interface QueueFileData {
  version: number
  jobs: QueueJob[]
}

export interface JsonQueueRepositoryOptions {
  path: string
  debounceMs?: number
  onCorrupt?: (backupPath: string, error: unknown) => void
}

export class JsonQueueRepository implements QueueRepository {
  private readonly writer: DebouncedJsonWriter

  constructor(private readonly options: JsonQueueRepositoryOptions) {
    this.writer = new DebouncedJsonWriter(options.path, options.debounceMs ?? 300)
  }

  async load(): Promise<QueueJob[]> {
    const raw = await readJsonSafe<unknown>(this.options.path, null, this.options.onCorrupt)
    const jobs = (raw as Partial<QueueFileData> | null)?.jobs
    return Array.isArray(jobs) ? jobs.filter(isQueueJob).map(restoreJob) : []
  }

  save(jobs: () => QueueJob[]): void {
    this.writer.schedule((): QueueFileData => ({
      version: QUEUE_VERSION,
      jobs: jobs().map(persistedJob)
    }))
  }

  flush(): Promise<void> {
    return this.writer.flush()
  }
}
