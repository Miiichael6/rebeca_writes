import { useState } from 'react'
import type { ModelDownloadResult } from '@shared/models'

/** En qué está el modelo que necesita el ajuste tras activarlo. */
export type ModelToggleState = 'idle' | 'downloading' | 'failed'

export interface ModelToggle {
  enabled: boolean
  modelState: ModelToggleState
  setEnabled: (enabled: boolean) => void
}

/**
 * Un interruptor que necesita un modelo auxiliar (voces, filtro de voz). Al activarlo lo
 * descarga si falta, para que el primer uso ya lo tenga.
 */
export function useModelToggle(
  enabled: boolean,
  saveEnabled: (enabled: boolean) => void,
  prepareModel: () => Promise<ModelDownloadResult>
): ModelToggle {
  const [modelState, setModelState] = useState<ModelToggleState>('idle')

  const setEnabled = (value: boolean): void => {
    saveEnabled(value)
    if (!value) return
    setModelState('downloading')
    void prepareModel()
      .then((result) => setModelState(result.status === 'done' ? 'idle' : 'failed'))
      .catch(() => setModelState('failed'))
  }

  return { enabled, modelState, setEnabled }
}
