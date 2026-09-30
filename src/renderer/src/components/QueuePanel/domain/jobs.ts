import type { QueueJob } from '@shared/types'
import { AUTO_LANGUAGE, languageTag } from '@shared/whisper'

/** Clave estable para la lista con animación de salida. */
export const jobKey = (job: QueueJob): string => job.id

export interface QueueStats {
  processing: boolean
  pendingCount: number
  /** Hay algo terminado (con éxito, error o cancelado) que se puede limpiar. */
  finished: boolean
}

export function queueStats(jobs: readonly QueueJob[]): QueueStats {
  return {
    processing: jobs.some((j) => j.status === 'processing'),
    pendingCount: jobs.filter((j) => j.status === 'pending').length,
    finished: jobs.some((j) => j.status !== 'pending' && j.status !== 'processing')
  }
}

export interface DescribeOptions {
  /** Etiqueta de cada modelo por id. */
  modelLabels: ReadonlyMap<string, string>
  /** Nombre legible de una etiqueta de idioma (BCP 47), si se conoce. */
  languageName: (tag: string) => string | undefined
  autoLabel: string
  translatedLabel: string
}

/** Línea de detalle de un trabajo: «modelo · idioma · traducido». */
export function describeJob(job: QueueJob, options: DescribeOptions): string {
  const language =
    job.language === AUTO_LANGUAGE
      ? options.autoLabel
      : (options.languageName(languageTag(job.language)) ?? job.language)
  return [
    options.modelLabels.get(job.model) ?? job.model,
    language,
    ...(job.translate ? [options.translatedLabel] : [])
  ].join(' · ')
}

/** Alt+↑/↓ reordena un trabajo pendiente: `-1` sube, `1` baja, `0` no es un atajo. */
export function reorderKeyDelta(key: string, altKey: boolean, pending: boolean): -1 | 0 | 1 {
  if (!pending || !altKey) return 0
  if (key === 'ArrowUp') return -1
  if (key === 'ArrowDown') return 1
  return 0
}

/** Id del vecino de `id` a `delta` posiciones, o `undefined` si se sale de la lista. */
export function neighborId(
  jobs: readonly QueueJob[],
  id: string,
  delta: -1 | 1
): string | undefined {
  const index = jobs.findIndex((j) => j.id === id)
  return index < 0 ? undefined : jobs[index + delta]?.id
}

/** Fila sobre la que se suelta: la que está bajo el puntero mientras se arrastra otra. */
export function isDropTarget(overId: string | null, dragId: string | null, id: string): boolean {
  return overId === id && dragId !== null && dragId !== id
}
