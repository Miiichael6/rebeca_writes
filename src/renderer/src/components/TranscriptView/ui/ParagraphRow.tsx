import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '@shared/types'
import type { SearchMatch } from '@renderer/lib/search'
import type { EditHandlers } from '../application/useSegmentEditing'
import { rowMatchRange } from '../domain/rows'
import { editedProps } from './editedProps'
import { renderHighlight } from './highlight'
import { SegmentEditor } from './SegmentEditor'

interface ParagraphRowProps {
  segments: readonly Segment[]
  /** Segmentos del párrafo: `[from, to)`. */
  from: number
  to: number
  /** Índice de la fila (el párrafo), para `measureElement`. */
  index: number
  start: number
  measure: (el: Element | null) => void
  onSeek: (t: number) => void
  /** Segmento activo si está en este párrafo, si no -1. */
  activeSegment: number
  matches: readonly SearchMatch[]
  /** Índice global de la coincidencia actual si está en este párrafo, si no -1. */
  currentMatch: number
  /** Segmento que se está editando si está en este párrafo, si no -1. */
  editIndex: number
  draft: string | null
  edit: EditHandlers
}

/**
 * El párrafo no cambió si sus segmentos son los mismos objetos, aunque el array sea otro
 * (llegaron segmentos al final durante la transcripción).
 */
function sameParagraph(a: ParagraphRowProps, b: ParagraphRowProps): boolean {
  if (
    a.from !== b.from ||
    a.to !== b.to ||
    a.index !== b.index ||
    a.start !== b.start ||
    a.measure !== b.measure ||
    a.onSeek !== b.onSeek ||
    a.activeSegment !== b.activeSegment ||
    a.matches !== b.matches ||
    a.currentMatch !== b.currentMatch ||
    a.editIndex !== b.editIndex ||
    a.draft !== b.draft ||
    a.edit !== b.edit
  ) {
    return false
  }
  for (let i = a.from; i < a.to; i++) if (a.segments[i] !== b.segments[i]) return false
  return true
}

/**
 * Un párrafo de "Unir líneas": texto continuo sin marcas de tiempo, pero cada segmento es un
 * `<span>` propio para poder hacer clic en él y resaltar el activo y las coincidencias.
 */
export const ParagraphRow = memo(function ParagraphRow({
  segments,
  from,
  to,
  index,
  start,
  measure,
  onSeek,
  activeSegment,
  matches,
  currentMatch,
  editIndex,
  draft,
  edit
}: ParagraphRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const parts: React.ReactNode[] = []
  for (let i = from; i < to; i++) {
    const segment = segments[i]
    const { first, end } = rowMatchRange(matches, i, i + 1)
    if (i > from) parts.push(' ')
    if (i === editIndex && draft !== null) {
      parts.push(
        <span key={i} data-seg={i} className="editing">
          <SegmentEditor draft={draft} edit={edit} />
        </span>
      )
      continue
    }
    const edited = editedProps(segment, t)
    const classes = [i === activeSegment && 'active', edited.className].filter(Boolean)
    parts.push(
      <span
        key={i}
        data-seg={i}
        className={classes.length > 0 ? classes.join(' ') : undefined}
        title={edited.title}
        aria-current={i === activeSegment || undefined}
        onClick={() => onSeek(segment.start)}
        onDoubleClick={() => edit.start(i)}
      >
        {renderHighlight(segment.text, matches, first, end - first, currentMatch)}
      </span>
    )
  }
  return (
    <p
      ref={measure}
      data-index={index}
      className="segment paragraph"
      style={{ transform: `translateY(${start}px)` }}
      tabIndex={0}
      onKeyDown={(e) => {
        // Enter salta al principio del párrafo; cada segmento se elige con el ratón.
        if (e.key === 'Enter') onSeek(segments[from].start)
      }}
    >
      {parts}
    </p>
  )
}, sameParagraph)
