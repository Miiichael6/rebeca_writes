import { applyDictionary, type DictionaryEntry } from './dictionary'
import { editSegment } from './editSegment'
import type { Segment } from './types'

export interface ReappliedSegments {
  segments: Segment[]
  /** Segmentos cuyo texto cambió. */
  changed: number
}

/** Segmento sin las marcas de edición, con el texto `text` y el de whisper si difiere. */
function fromWhisper(segment: Segment, whisper: string, text: string): Segment {
  const next: Segment = { ...segment, text }
  delete next.edited
  delete next.originalText
  if (text !== whisper) next.originalText = whisper
  return next
}

/**
 * «Aplicar diccionario» a una transcripción ya hecha (tarea 42). Los segmentos sin editar se
 * corrigen desde el texto de whisper (`originalText ?? text`), así quitar una palabra del
 * diccionario y volver a aplicarlo deshace su cambio; los editados a mano se corrigen sobre lo
 * que escribió el usuario, sin perder su original. Todo se puede restaurar segmento a segmento.
 */
export function reapplyDictionary(
  segments: readonly Segment[],
  entries: readonly DictionaryEntry[]
): ReappliedSegments {
  let changed = 0
  const next = segments.map((segment) => {
    let result: Segment
    if (segment.edited) {
      const text = applyDictionary(segment.text, entries)
      // `editSegment` deja solo tiempos y texto: se le devuelve quién habla.
      const speaker = segment.speaker === undefined ? {} : { speaker: segment.speaker }
      result = text === segment.text ? segment : { ...editSegment(segment, text), ...speaker }
    } else {
      const whisper = segment.originalText ?? segment.text
      result = fromWhisper(segment, whisper, applyDictionary(whisper, entries))
    }
    if (result.text !== segment.text) changed++
    return result
  })
  return { segments: next, changed }
}
