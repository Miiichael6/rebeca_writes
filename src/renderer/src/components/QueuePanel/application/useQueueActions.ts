import { usePorts } from './ports'

export interface QueueActions {
  addFiles: () => Promise<void>
  openJob: (id: string) => Promise<void>
}

export function useQueueActions(): QueueActions {
  const { queue, history, panel } = usePorts()

  return {
    addFiles: async () => {
      try {
        const result = await queue.pickFiles()
        if (result.added > 0) queue.announceAdded(result)
      } catch (err) {
        console.error('No se pudieron agregar archivos a la cola', err)
      }
    },
    openJob: async (id) => {
      if (await history.openJob(id)) {
        panel.showMain()
        panel.setOpen(false)
      }
    }
  }
}
