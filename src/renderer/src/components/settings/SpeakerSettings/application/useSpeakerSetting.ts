import { useModelToggle, type ModelToggle } from '@renderer/lib/useModelToggle'
import { usePorts } from './ports'

/**
 * El interruptor "Detectar quién habla". Al activarlo descarga el modelo de voces (si falta),
 * para que la primera grabación ya tenga hablantes.
 */
export function useSpeakerSetting(): ModelToggle {
  const { settings, model } = usePorts()
  return useModelToggle(settings.useDetectSpeakers(), settings.setDetectSpeakers, model.prepare)
}
