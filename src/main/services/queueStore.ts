import type { QueueJob } from '@shared/types'
import { DebouncedJsonWriter, readJsonSafe } from './fsAtomic'

/**
 * `userData/queue.json`: `{ version, jobs: QueueJob[] }`. Solo lectura y guardado; la lógica
 * de la cola (y la instancia con la ruta real) es de la tarea 17.
 */

const QUEUE_VERSION = 1

interface QueueFileData {
  version: number
  jobs: QueueJob[]
}

export interface QueueStoreOptions {
  path: string
  debounceMs?: number
  onCorrupt?: (backupPath: string, error: unknown) => void
}

function isJob(value: unknown): value is QueueJob {
  if (typeof value !== 'object' || value === null) return false
  const job = value as Record<string, unknown>
  return typeof job.id === 'string' && typeof job.filePath === 'string'
}

/** El trabajo que estaba en proceso al cerrarse la app vuelve a `pending` (tarea 17 paso 4). */
function restoreJob(job: QueueJob): QueueJob {
  const restored = { ...job }
  delete restored.progress
  if (restored.status === 'processing') restored.status = 'pending'
  return restored
}

export class QueueStore {
  private readonly writer: DebouncedJsonWriter

  constructor(private readonly options: QueueStoreOptions) {
    this.writer = new DebouncedJsonWriter(options.path, options.debounceMs ?? 300)
  }

  async load(): Promise<QueueJob[]> {
    const raw = await readJsonSafe<unknown>(this.options.path, null, this.options.onCorrupt)
    const jobs = (raw as Partial<QueueFileData> | null)?.jobs
    return Array.isArray(jobs) ? jobs.filter(isJob).map(restoreJob) : []
  }

  /** Guarda con debounce; `jobs` se lee al escribir, así vale pasar el array vivo de la cola. */
  save(jobs: () => QueueJob[]): void {
    this.writer.schedule((): QueueFileData => ({
      version: QUEUE_VERSION,
      jobs: jobs().map((job) => {
        const stored = { ...job }
        delete stored.progress
        return stored
      })
    }))
  }

  flush(): Promise<void> {
    return this.writer.flush()
  }
}
