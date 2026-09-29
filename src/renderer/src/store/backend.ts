import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import type { BackendInfo, CudaErrorCode, CudaPackageStatus, CudaProgress } from '@shared/types'
import i18n from '@renderer/i18n'
import { updateSettings, useSettingsStore } from './settings'
import { toast } from './toast'
import { useUiStore } from './ui'

interface BackendState {
  info: BackendInfo | null
  cuda: CudaPackageStatus | null
  /** Progreso de la descarga o instalación de CUDA en curso. */
  progress: CudaProgress | null
  refresh: () => Promise<void>
  downloadCuda: () => Promise<void>
  cancelCuda: () => void
  removeCuda: () => Promise<void>
}

function showError(code: CudaErrorCode): void {
  toast(i18n.t(`errors.${code}`), 6000)
}

export const useBackendStore = create<BackendState>()((set, get) => ({
  info: null,
  cuda: null,
  progress: null,
  refresh: async () => {
    const [info, cuda] = await Promise.all([
      window.api.backend.getInfo(),
      window.api.backend.cuda.getStatus()
    ])
    const busy = cuda.state === 'downloading' || cuda.state === 'installing'
    set((s) => ({ info, cuda, progress: busy ? s.progress : null }))
  },
  downloadCuda: async () => {
    const result = await window.api.backend.cuda.download()
    set({ progress: null })
    if (result.status === 'error') showError(result.code)
    else if (result.status === 'done') toast(i18n.t('backend.cudaInstalled'), 5000)
    await get().refresh()
  },
  cancelCuda: () => {
    window.api.backend.cuda.cancel()
  },
  removeCuda: async () => {
    const result = await window.api.backend.cuda.remove()
    if (!result.ok) showError(result.code)
    await get().refresh()
  }
}))

/** Carga el backend y el estado de CUDA y los mantiene al día. Se llama una vez, en App. */
export function useBackendSync(): void {
  useEffect(() => {
    const { refresh } = useBackendStore.getState()
    const load = (): void => {
      refresh().catch((err) => console.error('No se pudo leer el backend', err))
    }
    load()
    const offChanged = window.api.backend.onChanged(load)
    const offProgress = window.api.backend.cuda.onProgress((progress) =>
      useBackendStore.setState({ progress })
    )
    return () => {
      offChanged()
      offProgress()
    }
  }, [])
}

/**
 * Aviso de una sola vez cuando hay NVIDIA y CUDA no está: "Tu GPU NVIDIA puede transcribir
 * mucho más rápido", con "Ver" para ir a Configuración. La marca queda en settings.
 */
export function useCudaOfferToast(): void {
  const { t } = useTranslation()
  const downloadable = useBackendStore((s) => s.info?.cudaDownloadable ?? false)
  const offered = useSettingsStore((s) => s.settings.cudaOffered)

  useEffect(() => {
    if (!downloadable || offered) return
    updateSettings({ cudaOffered: true })
    toast(t('backend.cudaOffer'), 12_000, {
      label: t('backend.cudaOfferAction'),
      onSelect: () => useUiStore.getState().setView('settings')
    })
  }, [downloadable, offered, t])
}
