import { useState } from 'react'
import { usePorts } from './ports'

/** En qué está el modelo de voces tras activar el ajuste. */
export type SpeakerModelState = 'idle' | 'downloading' | 'failed'

/**
 * El interruptor "Detectar quién habla". Al activarlo descarga el modelo de voces (si falta),
 * para que la primera grabación ya tenga hablantes.
 */
export function useSpeakerSetting(): {
  enabled: boolean
  modelState: SpeakerModelState
  setEnabled: (enabled: boolean) => void
} {
  const { settings, model } = usePorts()
  const enabled = settings.useDetectSpeakers()
  const [modelState, setModelState] = useState<SpeakerModelState>('idle')

  const setEnabled = (value: boolean): void => {
    settings.setDetectSpeakers(value)
    if (!value) return
    setModelState('downloading')
    void model
      .prepare()
      .then((result) => setModelState(result.status === 'done' ? 'idle' : 'failed'))
      .catch(() => setModelState('failed'))
  }

  return { enabled, modelState, setEnabled }
}
