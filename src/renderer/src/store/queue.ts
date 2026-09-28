import { create } from 'zustand'
import type { QueueJob } from '@shared/types'
import { mockQueue } from './mocks'

interface QueueState {
  jobs: QueueJob[]
}

/** Cola de ejemplo con un trabajo en cada estado. La lógica real es de la tarea 17. */
export const useQueueStore = create<QueueState>()(() => ({
  jobs: mockQueue
}))

/** Trabajos que faltan: pendientes y el que se está procesando. */
export const selectPendingCount = (s: QueueState): number =>
  s.jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length
