import { useListExit } from '@renderer/lib/useListExit'
import { filterLabels, useHistoryStore } from '@renderer/store/history'
import { useModelsStore } from '@renderer/store/models'
import { announceQueued, reorderQueue, useQueueStore } from '@renderer/store/queue'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useUiStore } from '@renderer/store/ui'
import { jobKey } from '../domain/jobs'
import type { QueuePanelPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand y `window.api`. Es el único sitio del
 * panel de la cola que los conoce.
 */
export const storePorts: QueuePanelPorts = {
  queue: {
    useJobs: () => useQueueStore((s) => s.jobs),
    usePaused: () => useQueueStore((s) => s.paused),
    useResumePending: () => useQueueStore((s) => s.resumePending),
    useExiting: (jobs) => useListExit(jobs, jobKey),
    pickFiles: () => window.api.queue.pickFiles(filterLabels()),
    announceAdded: announceQueued,
    remove: (id) => window.api.queue.remove(id),
    reorder: reorderQueue,
    pause: () => window.api.queue.pause(),
    resume: () => window.api.queue.resume(),
    discard: () => window.api.queue.discard(),
    cancelCurrent: () => window.api.queue.cancelCurrent(),
    clearCompleted: () => window.api.queue.clearCompleted()
  },
  models: {
    useModels: () => useModelsStore((s) => s.models)
  },
  settings: {
    useOptions: () => useSettingsStore((s) => s.settings.queue),
    setOptions: (queue) => updateSettings({ queue })
  },
  history: {
    openJob: (id) => useHistoryStore.getState().openQueueJob(id)
  },
  panel: {
    useOpen: () => useUiStore((s) => s.queueOpen),
    setOpen: (open) => useUiStore.getState().setQueueOpen(open),
    showMain: () => useUiStore.getState().setView('main')
  }
}
