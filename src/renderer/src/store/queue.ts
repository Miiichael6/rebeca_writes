import { useEffect } from 'react'
import { create } from 'zustand'
import { APP_NAME } from '@shared/app'
import type { QueueAddResult, QueueJob, QueueState } from '@shared/types'
import i18n from '@renderer/i18n'
import { useHistoryStore } from './history'
import { toast } from './toast'
import { beginJob, useTranscriptStore } from './transcript'

/**
 * Espejo de la cola del main (tarea 17). La cola vive en el main; aquí solo se recibe su
 * estado y se piden las acciones (`window.api.queue`).
 */
export const useQueueStore = create<QueueState>()(() => ({
  jobs: [],
  paused: false,
  resumePending: false
}))

/** Trabajos que faltan: pendientes y el que se está procesando. */
export const selectPendingCount = (s: QueueState): number =>
  s.jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length

export function isQueueJob(jobId: string): boolean {
  return useQueueStore.getState().jobs.some((j) => j.id === jobId)
}

/** Resumen de lo que se agregó: "Se agregaron 48 archivos a la cola, 2 ignorados (...)". */
export function announceQueued({ added, ignored }: QueueAddResult): void {
  if (added === 0) {
    toast(i18n.t('queue.noneAdded'), 4000)
    return
  }
  const parts = [i18n.t('queue.added', { count: added })]
  if (ignored > 0) parts.push(i18n.t('queue.ignored', { count: ignored }))
  toast(parts.join(', '), ignored > 0 ? 4000 : 2500)
}

/** Reordena en local al momento (sin esperar al main) y se lo pide al main. */
export function reorderQueue(ids: string[]): void {
  const byId = new Map(useQueueStore.getState().jobs.map((j) => [j.id, j]))
  const jobs = ids.map((id) => byId.get(id)).filter((j): j is QueueJob => j !== undefined)
  useQueueStore.setState({ jobs })
  window.api.queue.reorder(ids).catch(() => {})
}

/**
 * El trabajo que la cola está procesando pasa a ser el trabajo en vivo de la vista, así
 * su progreso, sus segmentos y el indicador del historial se ven igual que al transcribir a mano.
 */
function followProcessing(state: QueueState): void {
  const job = state.jobs.find((j) => j.status === 'processing' && j.historyId)
  if (!job?.historyId || useTranscriptStore.getState().job?.jobId === job.id) return
  beginJob(job.id, job.historyId)
  useHistoryStore.getState().patchEntry(job.historyId, {
    status: 'transcribing',
    progress: 0,
    model: job.model,
    language: job.language,
    detectedLanguage: undefined
  })
}

function applyState(state: QueueState): void {
  useQueueStore.setState(state)
  followProcessing(state)
}

/** Sigue la cola del main y avisa con una notificación de Windows al vaciarse. Se llama una vez, en App. */
export function useQueueSync(): void {
  useEffect(() => {
    const api = window.api.queue
    let alive = true
    api
      .getState()
      .then((state) => alive && applyState(state))
      .catch((err) => console.error('No se pudo leer la cola', err))
    const offs = [
      window.api.history.onAdded((entry) => useHistoryStore.getState().upsertEntry(entry)),
      api.onChanged(applyState),
      api.onFilesReceived(announceQueued),
      api.onDrained(({ done, errors }) => {
        const body = [
          i18n.t('queue.notify.done', { count: done }),
          ...(errors > 0 ? [i18n.t('queue.notify.errors', { count: errors })] : [])
        ].join(', ')
        window.api.app.notify(`${APP_NAME} · ${i18n.t('queue.notify.title')}`, body).catch(() => {})
      })
    ]
    return () => {
      alive = false
      offs.forEach((off) => off())
    }
  }, [])
}
