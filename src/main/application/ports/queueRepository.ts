import type { QueueJob } from '@shared/types'

/** Puerto de salida: dónde se guarda la cola de transcripción entre sesiones. */
export interface QueueRepository {
  load(): Promise<QueueJob[]>
  /** `jobs` se lee al escribir, así vale pasar el array vivo de la cola. */
  save(jobs: () => QueueJob[]): void
  flush(): Promise<void>
}
