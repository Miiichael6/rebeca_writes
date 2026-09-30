import { useState } from 'react'
import type { CudaProgress } from '@shared/types'
import { cudaCard, type CudaCard } from '../domain/backend'
import { usePorts } from './ports'

export interface CudaPackage {
  /** `null`: la tarjeta no se muestra. */
  card: CudaCard | null
  progress: CudaProgress | null
  confirmingRemove: boolean
  download: () => void
  cancel: () => void
  askRemove: () => void
  cancelRemove: () => void
  confirmRemove: () => void
}

/** Descargar, cancelar y quitar el paquete CUDA, con confirmación antes de quitarlo. */
export function useCudaPackage(): CudaPackage {
  const { backend } = usePorts()
  const info = backend.useInfo()
  const cuda = backend.useCuda()
  const progress = backend.useCudaProgress()
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  return {
    card: cudaCard(info, cuda),
    progress,
    confirmingRemove,
    download: () => void backend.downloadCuda(),
    cancel: backend.cancelCuda,
    askRemove: () => setConfirmingRemove(true),
    cancelRemove: () => setConfirmingRemove(false),
    confirmRemove: () => {
      setConfirmingRemove(false)
      void backend.removeCuda()
    }
  }
}
