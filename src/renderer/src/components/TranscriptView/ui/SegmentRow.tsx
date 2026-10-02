import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '@shared/types'
import type { SearchMatch } from '@renderer/lib/search'
import { formatTimestamp } from '@renderer/lib/time'
import type { EditHandlers } from '../application/useSegmentEditing'
import { editedProps } from './editedProps'
import { renderHighlight } from './highlight'
import { SegmentEditor } from './SegmentEditor'
import { SpeakerTag } from './SpeakerTag'

interface SegmentRowProps {
  segment: Segment
  index: number
  active: boolean
  /** Acaba de llegar por streaming: aparece animado (no al reciclarlo el virtualizador). */
  arriving: boolean
  start: number
  measure: (el: Element | null) => void
  onSeek: (t: number) => void
  /** Todas las coincidencias; las de este segmento son `matchCount` a partir de `firstMatch`. */
  matches: readonly SearchMatch[]
  firstMatch: number
  matchCount: number
  /** Índice global de la coincidencia actual si está en este segmento, si no -1. */
  currentMatch: number
  /** Borrador si este segmento se está editando, si no `null`. */
  draft: string | null
  edit: EditHandlers
  /** Quien empieza a hablar en este segmento, o `null` si sigue la misma voz (tarea 35). */
  speaker: string | null
  speakerName: string
}

/**
 * Un segmento de la lista virtualizada. Memorizado: al avanzar el video solo se vuelven a
 * pintar el que deja de estar activo y el nuevo.
 */
export const SegmentRow = memo(function SegmentRow({
  segment,
  index,
  active,
  arriving,
  start,
  measure,
  onSeek,
  matches,
  firstMatch,
  matchCount,
  currentMatch,
  draft,
  edit,
  speaker,
  speakerName
}: SegmentRowProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <p
      ref={measure}
      data-index={index}
      data-seg={index}
      className={`segment${active ? ' active' : ''}${arriving ? ' arriving' : ''}`}
      style={{ transform: `translateY(${start}px)` }}
      aria-current={active || undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSeek(segment.start)}
      onKeyDown={(e) => {
        // Solo Enter: Espacio sigue siendo play/pausa (usePlayerShortcuts).
        if (e.key === 'Enter') onSeek(segment.start)
      }}
      onDoubleClick={() => edit.start(index)}
    >
      <time>[{formatTimestamp(segment.start)}]</time>
      {speaker !== null && <SpeakerTag speaker={speaker} name={speakerName} />}
      {draft === null ? (
        <span {...editedProps(segment, t)}>
          {renderHighlight(segment.text, matches, firstMatch, matchCount, currentMatch)}
        </span>
      ) : (
        <SegmentEditor draft={draft} edit={edit} />
      )}
    </p>
  )
})
