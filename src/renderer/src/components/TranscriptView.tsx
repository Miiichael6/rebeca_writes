import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button } from './ui'

export interface Segment {
  start: number
  text: string
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TranscriptView({ segments }: { segments: Segment[] }): React.JSX.Element {
  return (
    <section className="transcript">
      <div className="transcript-header">
        <h2>Transcripción local con Whisper</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Resultado anterior"
          icon={<ChevronUp size={18} strokeWidth={1.5} />}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Resultado siguiente"
          icon={<ChevronDown size={18} strokeWidth={1.5} />}
        />
        <div className="search">
          <input
            className="input"
            placeholder="Buscar..."
            aria-label="Buscar en la transcripción"
          />
          <Search size={14} strokeWidth={1.5} />
        </div>
      </div>

      <div className="transcript-body">
        {segments.length === 0 ? (
          <div className="empty">Abre un archivo para empezar a transcribir</div>
        ) : (
          segments.map((seg) => (
            <p className="segment" key={seg.start}>
              <time>[{formatTime(seg.start)}]</time>
              <span>{seg.text}</span>
            </p>
          ))
        )}
      </div>
    </section>
  )
}

export default TranscriptView
