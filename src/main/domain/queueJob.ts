import type { QueueJob } from '@shared/types'

export function isQueueJob(value: unknown): value is QueueJob {
  if (typeof value !== 'object' || value === null) return false
  const job = value as Record<string, unknown>
  return typeof job.id === 'string' && typeof job.filePath === 'string'
}

/** El trabajo que estaba en proceso al cerrarse la app vuelve a `pending` (tarea 17 paso 4). */
export function restoreJob(job: QueueJob): QueueJob {
  const restored = { ...job }
  delete restored.progress
  if (restored.status === 'processing') restored.status = 'pending'
  return restored
}

/** `progress` es solo de memoria: no se guarda. */
export function persistedJob(job: QueueJob): QueueJob {
  const stored = { ...job }
  delete stored.progress
  return stored
}

export const FINISHED_STATUSES: ReadonlySet<QueueJob['status']> = new Set([
  'done',
  'error',
  'cancelled'
])

/**
 * Nuevo orden de la lista. Los ids desconocidos se ignoran y los que falten quedan al
 * final en su orden de antes, así un orden viejo del renderer no pierde trabajos.
 */
export function reorderJobs(jobs: QueueJob[], ids: string[]): QueueJob[] {
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const next: QueueJob[] = []
  for (const id of ids) {
    const job = byId.get(id)
    if (job) {
      next.push(job)
      byId.delete(id)
    }
  }
  next.push(...byId.values())
  return next
}
