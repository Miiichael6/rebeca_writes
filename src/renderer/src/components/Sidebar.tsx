import { CircleAlert, Eraser, FileMusic, FileVideoCamera, FolderOpen, Library } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mediaKindOf } from '@shared/media'
import type { HistoryEntry } from '@shared/types'
import { groupHistory, type HistoryGroupKey } from '@renderer/lib/historyGroups'
import { filterHistory, useHistoryStore } from '@renderer/store/history'
import { selectPendingCount, useQueueStore } from '@renderer/store/queue'
import { useUiStore } from '@renderer/store/ui'
import { Button, ConfirmDialog } from './ui'

const GROUP_LABELS: Record<HistoryGroupKey, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta semana',
  month: 'Este mes',
  older: 'Anteriores'
}

/** Anillo de progreso pequeño para el ítem que se está transcribiendo. */
function ProgressRing({ value }: { value: number }): React.JSX.Element {
  const r = 6
  const c = 2 * Math.PI * r
  return (
    <svg className="progress-ring" width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <circle cx={8} cy={8} r={r} className="progress-ring-track" />
      <circle
        cx={8}
        cy={8}
        r={r}
        className="progress-ring-value"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
      />
    </svg>
  )
}

function HistoryItem({
  entry,
  selected,
  onSelect
}: {
  entry: HistoryEntry
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const Icon = mediaKindOf(entry.fileName) === 'audio' ? FileMusic : FileVideoCamera
  return (
    <button
      className={`history-item${selected ? ' selected' : ''}`}
      title={entry.fileName}
      aria-current={selected || undefined}
      onClick={onSelect}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden />
      <span className="history-item-name">{entry.fileName}</span>
      {entry.status === 'transcribing' && (
        <span className="history-item-status" title={`Transcribiendo ${entry.progress ?? 0} %`}>
          <ProgressRing value={entry.progress ?? 0} />
        </span>
      )}
      {entry.status === 'error' && (
        <span className="history-item-status error" title="Error al transcribir">
          <CircleAlert size={14} strokeWidth={1.75} />
        </span>
      )}
    </button>
  )
}

function Sidebar(): React.JSX.Element {
  const entries = useHistoryStore((s) => s.entries)
  const selectedId = useHistoryStore((s) => s.selectedId)
  const filter = useHistoryStore((s) => s.filter)
  const { select, setFilter, clear } = useHistoryStore.getState()
  const pendingCount = useQueueStore(selectPendingCount)
  const setQueueOpen = useUiStore((s) => s.setQueueOpen)
  const [confirmClear, setConfirmClear] = useState(false)

  const groups = useMemo(() => groupHistory(filterHistory(entries, filter)), [entries, filter])

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <Button icon={<FolderOpen size={16} strokeWidth={1.5} />}>Abrir archivo</Button>
        <Button
          aria-label="Borrar historial"
          icon={<Eraser size={16} strokeWidth={1.5} />}
          disabled={entries.length === 0}
          onClick={() => setConfirmClear(true)}
        />
      </div>

      <input
        className="input"
        type="search"
        placeholder="Filtrar por..."
        aria-label="Filtrar historial"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <nav className="history" aria-label="Historial">
        {groups.map((g) => (
          <section className="history-group" key={g.key}>
            <h3>{GROUP_LABELS[g.key]}</h3>
            {g.entries.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                onSelect={() => select(entry.id)}
              />
            ))}
          </section>
        ))}
        {groups.length === 0 && (
          <p className="history-empty">
            {entries.length === 0 ? 'El historial está vacío' : 'Sin resultados'}
          </p>
        )}
      </nav>

      <Button
        className="queue-btn"
        icon={<Library size={16} strokeWidth={1.5} />}
        onClick={() => setQueueOpen(true)}
      >
        Cola
        {pendingCount > 0 && (
          <span className="queue-count" aria-label={`${pendingCount} pendientes`}>
            {pendingCount}
          </span>
        )}
      </Button>

      <ConfirmDialog
        open={confirmClear}
        title="¿Borrar el historial?"
        confirmLabel="Borrar"
        danger
        onConfirm={() => {
          clear()
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      >
        Se eliminarán todas las transcripciones guardadas. Los archivos originales y los .srt
        exportados no se tocan.
      </ConfirmDialog>
    </aside>
  )
}

export default Sidebar
