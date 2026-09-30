import { LocateFixed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '@shared/types'
import type { SearchMatch } from '@renderer/lib/search'
import { usePorts } from '../application/ports'
import { useSegmentList } from '../application/useSegmentList'
import { currentInRange, indexInRange, rowMatchRange } from '../domain/rows'
import { Button, ContextMenu, type MenuItem } from '../../ui'
import { ParagraphRow } from './ParagraphRow'
import { SegmentRow } from './SegmentRow'

/**
 * Lista virtualizada (spec §7): solo están en el DOM los segmentos visibles y unos pocos
 * alrededor, así una transcripción de horas se desplaza igual de fluida que una corta.
 * Con "Unir líneas" cada fila es un párrafo; sin él, un segmento.
 */
interface SegmentListProps {
  segments: Segment[]
  matches: readonly SearchMatch[]
  currentMatch: number
}

export function SegmentList({
  segments,
  matches,
  currentMatch
}: SegmentListProps): React.JSX.Element {
  const { t } = useTranslation()
  const { transcript } = usePorts()
  const { scrollRef, model: list } = useSegmentList(segments, t('transcript.editLocked'))
  const { virtualizer, paragraphs, activeIndex, activeEdit, edit, menu } = list

  const menuSegment = menu ? segments[menu.index] : undefined
  const menuItems: MenuItem[] = []
  if (menu && menuSegment) {
    menuItems.push({ label: t('transcript.edit'), onSelect: () => edit.start(menu.index) })
    const original = menuSegment.originalText
    if (menuSegment.edited && original !== undefined) {
      menuItems.push({
        label: t('transcript.restoreOriginal'),
        onSelect: () => transcript.editSegment(menu.index, original)
      })
    }
  }

  return (
    <div className="transcript-scroll">
      <div className="transcript-body" ref={scrollRef} tabIndex={-1} {...list.body}>
        <div
          className={`transcript-list${list.joinLines ? ' joined' : ''}`}
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            if (paragraphs) {
              const p = paragraphs[item.index]
              const { first, end } = rowMatchRange(matches, p.from, p.to)
              const editIndex = indexInRange(activeEdit?.index ?? null, p.from, p.to)
              return (
                <ParagraphRow
                  key={item.key}
                  segments={segments}
                  from={p.from}
                  to={p.to}
                  index={item.index}
                  start={item.start}
                  measure={virtualizer.measureElement}
                  onSeek={list.seek}
                  activeSegment={indexInRange(activeIndex, p.from, p.to)}
                  matches={matches}
                  currentMatch={currentInRange(currentMatch, first, end)}
                  editIndex={editIndex}
                  draft={editIndex === -1 ? null : activeEdit!.draft}
                  edit={edit}
                />
              )
            }
            // Coincidencias de la fila: solo se buscan para las que están en el DOM.
            const { first, end } = rowMatchRange(matches, item.index, item.index + 1)
            return (
              <SegmentRow
                key={item.key}
                segment={segments[item.index]}
                index={item.index}
                active={item.index === activeIndex}
                arriving={list.arriving(item.index)}
                start={item.start}
                measure={virtualizer.measureElement}
                onSeek={list.seek}
                matches={matches}
                firstMatch={first}
                matchCount={end - first}
                currentMatch={currentInRange(currentMatch, first, end)}
                draft={activeEdit?.index === item.index ? activeEdit.draft : null}
                edit={edit}
              />
            )
          })}
        </div>
      </div>
      {list.showReturn && (
        <Button
          className="transcript-return"
          size="sm"
          icon={<LocateFixed size={15} strokeWidth={1.5} />}
          onClick={list.followCurrent}
        >
          {t('transcript.backToCurrent')}
        </Button>
      )}
      <ContextMenu
        at={menuItems.length > 0 ? menu : null}
        onClose={list.closeMenu}
        items={menuItems}
        height={100}
        aria-label={t('transcript.segmentMenu')}
      />
    </div>
  )
}
