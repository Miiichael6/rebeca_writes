import { useModelToggle, type ModelToggle } from '@renderer/lib/useModelToggle'
import { usePorts } from './ports'

/**
 * El interruptor "Filtrar silencios y ruido" (tarea 36). Al activarlo descarga el modelo del
 * filtro de voz (si falta), para que la siguiente transcripción ya lo use.
 */
export function useVadSetting(): ModelToggle {
  const { options, vadModel } = usePorts()
  const { vad } = options.useValues()
  return useModelToggle(vad, (value) => options.update({ vad: value }), vadModel.prepare)
}
