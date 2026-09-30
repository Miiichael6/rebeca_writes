import { useMemo } from 'react'
import type { QueueJob } from '@shared/types'
import type { ExitingList } from '@renderer/lib/listExit'
import { describeJob, queueStats, type QueueStats } from '../domain/jobs'
import { usePorts } from './ports'

export interface QueueView {
  jobs: QueueJob[]
  rows: ExitingList<QueueJob>
  paused: boolean
  resumePending: boolean
  stats: QueueStats
}

/** Estado de la cola listo para pintar. */
export function useQueueView(): QueueView {
  const { queue } = usePorts()
  const jobs = queue.useJobs()
  const rows = queue.useExiting(jobs)
  const paused = queue.usePaused()
  const resumePending = queue.useResumePending()
  const stats = useMemo(() => queueStats(jobs), [jobs])
  return { jobs, rows, paused, resumePending, stats }
}

interface DescriberLabels {
  language: string
  autoLabel: string
  translatedLabel: string
}

/** Función que describe un trabajo («modelo · idioma · traducido») en el idioma de la interfaz. */
export function useJobDescriber({
  language,
  autoLabel,
  translatedLabel
}: DescriberLabels): (job: QueueJob) => string {
  const { models } = usePorts()
  const list = models.useModels()
  return useMemo(() => {
    const names = new Intl.DisplayNames([language], { type: 'language', fallback: 'code' })
    const modelLabels = new Map(list.map((m) => [m.id, m.label]))
    const languageName = (tag: string): string | undefined => names.of(tag)
    return (job) => describeJob(job, { modelLabels, languageName, autoLabel, translatedLabel })
  }, [list, language, autoLabel, translatedLabel])
}
