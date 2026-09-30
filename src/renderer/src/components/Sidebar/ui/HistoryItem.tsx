import { Check, CircleAlert, FileMusic, FileVideoCamera } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { mediaKindOf } from '@shared/media'
import type { HistoryEntry } from '@shared/types'
import { useLongPress } from '../application/useLongPress'
import { shownName } from '../domain/entry'

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

interface HistoryItemProps {
  entry: HistoryEntry
  selected: boolean
  /** Ya no está en el historial (o no pasa el filtro): se pinta su salida antes de quitarla. */
  exiting: boolean
  /** Modo de selección múltiple: el clic marca o desmarca en vez de abrir. */
  selecting: boolean
  checked: boolean
  onSelect: () => void
  onLongPress: () => void
  onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export function HistoryItem({
  entry,
  selected,
  exiting,
  selecting,
  checked,
  onSelect,
  onLongPress,
  onContextMenu
}: HistoryItemProps): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = mediaKindOf(entry.fileName) === 'audio' ? FileMusic : FileVideoCamera
  const longPress = useLongPress(onLongPress, selecting)

  return (
    <button
      className={`history-item${selected ? ' selected' : ''}${exiting ? ' exiting' : ''}${checked ? ' checked' : ''}`}
      title={entry.filePath}
      aria-current={selected || undefined}
      aria-pressed={selecting ? checked : undefined}
      {...longPress.handlers}
      onClick={() => {
        if (!longPress.consumeClick()) onSelect()
      }}
      onContextMenu={onContextMenu}
    >
      {selecting && (
        <span className="history-check" aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <Icon size={16} strokeWidth={1.5} aria-hidden />
      <span className="history-item-name">{shownName(entry)}</span>
      {entry.live && entry.status === 'transcribing' && (
        <span className="history-item-status" title={t('sidebar.live')}>
          <span className="live-dot" />
        </span>
      )}
      {!entry.live && entry.status === 'transcribing' && (
        <span
          className="history-item-status"
          title={t('sidebar.transcribing', { value: entry.progress ?? 0 })}
        >
          <ProgressRing value={entry.progress ?? 0} />
        </span>
      )}
      {entry.status === 'error' && (
        <span className="history-item-status error" title={t('sidebar.error')}>
          <CircleAlert size={14} strokeWidth={1.75} />
        </span>
      )}
    </button>
  )
}
