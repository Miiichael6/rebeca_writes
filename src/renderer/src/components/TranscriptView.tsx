import { ChevronDown, ChevronUp, FolderOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { formatClock, formatTimestamp } from '@renderer/lib/time'
import { useTranscriptStore } from '@renderer/store/transcript'
import { Button } from './ui'

function ProgressBar({
  progress,
  etaSec
}: {
  progress: number
  etaSec: number | null
}): React.JSX.Element {
  return (
    <div className="transcript-progress">
      <div
        className="transcript-progress-bar"
        role="progressbar"
        aria-label="Progreso de la transcripción"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="transcript-progress-text">
        {progress} %{etaSec !== null && ` · quedan ~${formatClock(etaSec)}`}
      </span>
    </div>
  )
}

function EmptyState(): React.JSX.Element | null {
  const status = useTranscriptStore((s) => s.status)
  switch (status) {
    case 'idle':
      return (
        <div className="empty">
          <FolderOpen size={32} strokeWidth={1.25} aria-hidden />
          <p>Abre un archivo para empezar</p>
        </div>
      )
    case 'ready':
      return (
        <div className="empty">
          <p>Pulsa Transcribir para empezar</p>
        </div>
      )
    case 'transcribing':
      return (
        <div className="empty">
          <p>Esperando los primeros segmentos...</p>
        </div>
      )
    default:
      return null
  }
}

function TranscriptView(): React.JSX.Element {
  const entry = useTranscriptStore((s) => s.entry)
  const segments = useTranscriptStore((s) => s.segments)
  const status = useTranscriptStore((s) => s.status)
  const progress = useTranscriptStore((s) => s.progress)
  const etaSec = useTranscriptStore((s) => s.etaSec)
  const activeIndex = useTranscriptStore((s) => s.activeIndex)
  // La búsqueda real (resaltado, "3 de 12", navegación) es de la tarea 14.
  const [query, setQuery] = useState('')

  return (
    <section className="transcript" aria-label="Transcripción">
      <div className="transcript-header">
        <h2 title={entry?.fileName}>{entry?.fileName ?? 'Transcripción'}</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Resultado anterior"
          icon={<ChevronUp size={18} strokeWidth={1.5} />}
          disabled={!query}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Resultado siguiente"
          icon={<ChevronDown size={18} strokeWidth={1.5} />}
          disabled={!query}
        />
        <div className="search">
          <input
            className="input"
            type="search"
            placeholder="Buscar..."
            aria-label="Buscar en la transcripción"
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
