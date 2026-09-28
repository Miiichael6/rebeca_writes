import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, CircleAlert, FolderOpen, Search } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '@shared/types'
import { findActiveSegment } from '@renderer/lib/segments'
import { formatClock, formatTimestamp } from '@renderer/lib/time'
import { registerTranscriptScroller } from '@renderer/lib/transcriptScroll'
import { usePlayerStore } from '@renderer/store/player'
import { useTranscriptStore } from '@renderer/store/transcript'
import { Button } from './ui'

/** Altura estimada de un segmento de una línea; la real se mide al pintarlo. */
const ESTIMATED_ROW_PX = 26

/** Barra fina bajo el encabezado mientras se transcribe el archivo abierto. */
function ProgressBar(): React.JSX.Element | null {
  const { t } = useTranslation()
  const job = useTranscriptStore((s) => (s.job?.entryId === s.entry?.id ? s.job : null))
  if (!job) return null
  const progress = Math.round(job.progress)
  return (
    <div className="transcript-progress">
      <span className="transcript-progress-phase">
        {job.phase === 'preparing'
          ? t('transcript.phasePreparing')
          : t('transcript.phaseTranscribing')}
      </span>
      <div
        className="transcript-progress-bar"
        role="progressbar"
        aria-label={t('transcript.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="transcript-progress-text">
        {t('common.percent', { value: progress })}
        {job.etaSec !== null &&
          ` · ${t('transcript.remaining', { time: formatClock(job.etaSec) })}`}
      </span>
    </div>
  )
}

/** Aviso fijo cuando la última transcripción del archivo abierto falló. */
function ErrorBanner(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useTranscriptStore((s) => s.status)
  const error = useTranscriptStore((s) => s.error)
  if (status !== 'error') return null
  return (
    <div className="transcript-error" role="alert">
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
      <span>{error ? t(`errors.${error}`) : t('transcript.failed')}</span>
    </div>
  )
}

function EmptyState(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useTranscriptStore((s) => s.status)
  switch (status) {
    case 'idle':
      return (
        <div className="empty">
          <FolderOpen size={32} strokeWidth={1.25} aria-hidden />
          <p>{t('transcript.emptyIdle')}</p>
        </div>
      )
    case 'ready':
      return (
        <div className="empty">
          <p>{t('transcript.emptyReady')}</p>
        </div>
      )
    case 'transcribing':
      return (
        <div className="empty">
          <p>{t('transcript.emptyWaiting')}</p>
        </div>
      )
    default:
      return null
  }
}

interface SegmentRowProps {
  segment: Segment
  index: number
  active: boolean
  start: number
  measure: (el: Element | null) => void
  onSeek: (t: number) => void
}

/**
 * Un segmento de la lista virtualizada. Memorizado: al avanzar el video solo se vuelven a
 * pintar el que deja de estar activo y el nuevo.
 */
const SegmentRow = memo(function SegmentRow({
  segment,
  index,
  active,
  start,
  measure,
  onSeek
}: SegmentRowProps): React.JSX.Element {
  return (
    <p
      ref={measure}
      data-index={index}
      className={`segment${active ? ' active' : ''}`}
      style={{ transform: `translateY(${start}px)` }}
      aria-current={active || undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSeek(segment.start)}
      onKeyDown={(e) => {
        // Solo Enter: Espacio sigue siendo play/pausa (usePlayerShortcuts).
        if (e.key === 'Enter') onSeek(segment.start)
      }}
    >
      <time>[{formatTimestamp(segment.start)}]</time>
      <span>{segment.text}</span>
    </p>
  )
})

/**
 * Lista virtualizada (spec §7): solo están en el DOM los segmentos visibles y unos pocos
 * alrededor, así una transcripción de horas se desplaza igual de fluida que una corta.
 */
function SegmentList({ segments }: { segments: Segment[] }): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  // El selector devuelve un índice: la lista solo se vuelve a pintar al cambiar de segmento.
  const activeIndex = usePlayerStore((s) =>
    s.src ? findActiveSegment(segments, s.currentTime) : null
  )
  const seek = usePlayerStore((s) => s.seek)

  // El virtualizador es mutable a propósito; a las filas solo pasan números y `measureElement`,
  // que es estable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_PX,
    overscan: 10,
    // Con la vista estable, `start` y `measure` no cambian entre renders y `memo` funciona.
    getItemKey: (index) => index
  })

  useEffect(
    () =>
      registerTranscriptScroller((index, align) =>
        virtualizer.scrollToIndex(index, { align, behavior: 'auto' })
      ),
    [virtualizer]
  )

  return (
    <div className="transcript-body" ref={scrollRef}>
      <div className="transcript-list" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <SegmentRow
            key={item.key}
            segment={segments[item.index]}
            index={item.index}
            active={item.index === activeIndex}
            start={item.start}
            measure={virtualizer.measureElement}
            onSeek={seek}
          />
        ))}
      </div>
    </div>
  )
}

function TranscriptView(): React.JSX.Element {
  const { t } = useTranslation()
  const entry = useTranscriptStore((s) => s.entry)
  const segments = useTranscriptStore((s) => s.segments)
  // La búsqueda real (resaltado, "3 de 12", navegación) es de la tarea 14.
  const [query, setQuery] = useState('')

  return (
    <section className="transcript" aria-label={t('transcript.title')}>
      <div className="transcript-header">
        <h2 title={entry?.fileName}>{entry?.fileName ?? t('transcript.title')}</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('transcript.previousResult')}
          icon={<ChevronUp size={18} strokeWidth={1.5} />}
          disabled={!query}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('transcript.nextResult')}
          icon={<ChevronDown size={18} strokeWidth={1.5} />}
          disabled={!query}
        />
        <div className="search">
          <input
            className="input"
            type="search"
            placeholder={t('transcript.searchPlaceholder')}
            aria-label={t('transcript.searchLabel')}
            value={query}
            disabled={segments.length === 0}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search size={14} strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      <ProgressBar />
      <ErrorBanner />

      {segments.length === 0 ? (
        <div className="transcript-body">
          <EmptyState />
        </div>
      ) : (
        // `key`: al cambiar de archivo la lista empieza arriba y sin medidas viejas.
        <SegmentList key={entry?.id} segments={segments} />
      )}
    </section>
  )
}

export default TranscriptView
