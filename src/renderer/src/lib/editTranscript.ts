import i18n from '@renderer/i18n'
import { toast } from '@renderer/store/toast'
import { applySegmentEdit } from '@renderer/store/transcript'

/**
 * Edición en línea (tarea 16): cambia el segmento en la vista y lo guarda en el historial.
 * Pasar `segment.originalText` lo restaura.
 */
export function editTranscriptSegment(index: number, text: string): void {
  const entryId = applySegmentEdit(index, text)
  if (entryId === null) return
  window.api.history.updateSegment(entryId, index, text).catch((err: unknown) => {
    console.error('No se pudo guardar la edición', err)
    toast(i18n.t('transcript.editSaveFailed'))
  })
}
