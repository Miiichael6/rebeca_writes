import { useEffect } from 'react'
import { create } from 'zustand'
import type { ModelActionResult, ModelErrorCode, ModelProgress, ModelStatus } from '@shared/models'
import i18n from '@renderer/i18n'
import { toast } from './toast'

interface ModelsState {
  models: ModelStatus[]
  /** Progreso de las descargas en curso, por id. */
  progress: Record<string, ModelProgress>
  refresh: () => Promise<void>
  download: (id: string) => Promise<void>
  cancel: (id: string) => void
  remove: (id: string) => Promise<void>
  addCustom: (path: string, name: string) => Promise<ModelActionResult>
}

function showError(code: ModelErrorCode): void {
  toast(i18n.t(`errors.${code}`), 5000)
}

export const useModelsStore = create<ModelsState>()((set, get) => ({
  models: [],
  progress: {},
  refresh: async () => set({ models: await window.api.models.list() }),
  download: async (id) => {
    const result = await window.api.models.download(id)
    set((s) => {
      const progress = { ...s.progress }
      delete progress[id]
      return { progress }
    })
    if (result.status === 'error') showError(result.code)
    await get().refresh()
  },
  cancel: (id) => {
    window.api.models.cancel(id)
  },
  remove: async (id) => {
    const result = await window.api.models.delete(id)
    if (!result.ok) showError(result.code)
  },
  addCustom: (path, name) => window.api.models.addCustom(path, name)
}))

/** Modelos listos para transcribir (combo de la barra superior). */
export function selectDownloaded(s: ModelsState): ModelStatus[] {
  return s.models.filter((m) => m.state === 'downloaded')
}

/** Carga la lista y la mantiene al día con los eventos del main. Se llama una vez, en App. */
export function useModelsSync(): void {
  useEffect(() => {
    const { refresh } = useModelsStore.getState()
    refresh()
    const offChanged = window.api.models.onChanged(() => refresh())
    const offProgress = window.api.models.onProgress((p) =>
      useModelsStore.setState((s) => ({ progress: { ...s.progress, [p.id]: p } }))
    )
    return () => {
      offChanged()
      offProgress()
    }
  }, [])
}
