import type { Segment } from './types'

/**
 * Segmento con el texto cambiado por el usuario (tarea 16). Guarda el de whisper en
 * `originalText` la primera vez; si el texto nuevo es el original, quita las marcas.
 * Lo usan el historial (main) y la vista (renderer), así los dos quedan iguales.
 */
export function editSegment(segment: Segment, text: string): Segment {
  const original = segment.originalText ?? segment.text
  const next: Segment = { start: segment.start, end: segment.end, text }
  if (text !== original) {
    next.edited = true
    next.originalText = original
  }
  return next
}

/**
 * Texto de whisper al que se puede volver con «Restaurar original», o `undefined` si el
 * segmento está como lo dio whisper. Vale para ediciones del usuario y para cambios del
 * diccionario (tarea 41), que guardan `originalText` sin marcar `edited`.
 */
export function restorableOriginal(segment: Segment): string | undefined {
  const original = segment.originalText
  return original !== undefined && original !== segment.text ? original : undefined
}
