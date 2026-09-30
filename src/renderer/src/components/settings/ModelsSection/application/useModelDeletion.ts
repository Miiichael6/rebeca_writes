import { useState } from 'react'
import type { ModelStatus } from '@shared/models'
import { usePorts } from './ports'

export interface ModelDeletion {
  /** Modelo pendiente de confirmar, o `null`. */
  target: ModelStatus | null
  ask: (model: ModelStatus) => void
  cancel: () => void
  confirm: () => void
}

/** Confirmación antes de eliminar (o quitar) un modelo. */
export function useModelDeletion(): ModelDeletion {
  const { models } = usePorts()
  const [target, setTarget] = useState<ModelStatus | null>(null)
  return {
    target,
    ask: setTarget,
    cancel: () => setTarget(null),
    confirm: () => {
      if (target) void models.remove(target.id)
      setTarget(null)
    }
  }
}
