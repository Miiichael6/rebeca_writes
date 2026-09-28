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
