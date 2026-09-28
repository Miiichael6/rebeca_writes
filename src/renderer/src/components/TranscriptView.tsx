import { ChevronDown, ChevronUp, FolderOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { findActiveSegment } from '@renderer/lib/segments'
import { formatClock, formatTimestamp } from '@renderer/lib/time'
import { usePlayerStore } from '@renderer/store/player'
import { useTranscriptStore } from '@renderer/store/transcript'
import { Button } from './ui'

function ProgressBar({
  progress,
  etaSec
}: {
  progress: number
  etaSec: number | null
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="transcript-progress">
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
        {etaSec !== null && ` · ${t('transcript.remaining', { time: formatClock(etaSec) })}`}
      </span>
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

function TranscriptView(): React.JSX.Element {
  const { t } = useTranslation()
  const entry = useTranscriptStore((s) => s.entry)
  const segments = useTranscriptStore((s) => s.segments)
  const status = useTranscriptStore((s) => s.status)
  const progress = useTranscriptStore((s) => s.progress)
  const etaSec = useTranscriptStore((s) => s.etaSec)
  // El selector devuelve un índice: la vista solo se vuelve a pintar al cambiar de segmento.
  const activeIndex = usePlayerStore((s) =>
    s.src ? findActiveSegment(segments, s.currentTime) : null
  )
  const seek = usePlayerStore((s) => s.seek)
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

      {status === 'transcribing' && <ProgressBar progress={progress} etaSec={etaSec} />}

      <div className="transcript-body">
        {segments.length === 0 ? (
          <EmptyState />
        ) : (
          segments.map((seg, i) => (
            <p
              className={`segment${i === activeIndex ? ' active' : ''}`}
              key={seg.start}
              aria-current={i === activeIndex || undefined}
              role="button"
              tabIndex={0}
              onClick={() => seek(seg.start)}
              onKeyDown={(e) => {
                // Solo Enter: Espacio sigue siendo play/pausa (usePlayerShortcuts).
                if (e.key === 'Enter') seek(seg.start)
              }}
            >
              <time>[{formatTimestamp(seg.start)}]</time>
              <span>{seg.text}</span>
            </p>
          ))
        )}
      </div>
    </section>
  )
}

export default TranscriptView
