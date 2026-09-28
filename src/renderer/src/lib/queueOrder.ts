import type { QueueJob } from '@shared/types'

/**
 * Mueve `id` a la posición de `targetId` (antes si sube, después si baja). Solo entre
 * pendientes: los demás no cambian de orden. Devuelve el nuevo orden de ids, o `null` si
 * no hay nada que mover.
 */
export function moveJob(jobs: QueueJob[], id: string, targetId: string): string[] | null {
  if (id === targetId) return null
  const from = jobs.findIndex((j) => j.id === id)
  const to = jobs.findIndex((j) => j.id === targetId)
  if (from < 0 || to < 0 || jobs[from].status !== 'pending' || jobs[to].status !== 'pending') {
    return null
  }
  const ids = jobs.map((j) => j.id)
  ids.splice(from, 1)
  ids.splice(to, 0, id)
  return ids
}
