import type { Segment } from '@shared/types'

/** Marca y tooltip de un segmento editado a mano. */
export function editedProps(
  segment: Segment,
  t: (key: 'transcript.edited', options: { original: string }) => string
): { className?: string; title?: string } {
  return segment.edited
    ? {
        className: 'edited',
        title: t('transcript.edited', { original: segment.originalText ?? '' })
      }
    : {}
}
