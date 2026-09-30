import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  GripVertical,
  LoaderCircle,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { JobStatus, QueueJob } from '@shared/types'
import { reorderKeyDelta } from '../domain/jobs'
import { Button } from '../../ui'

const STATUS_ICONS: Record<JobStatus, typeof X> = {
  pending: CircleDashed,
  processing: LoaderCircle,
  done: CircleCheck,
  error: CircleAlert,
  cancelled: CircleSlash
}

interface JobRowProps {
  job: QueueJob
  details: string
  dragging: boolean
  dropTarget: boolean
  /** Ya no está en la cola: se pinta su salida antes de quitar la fila. */
  exiting: boolean
  onOpen: () => void
  onRemove: () => void
  onMove: (delta: -1 | 1) => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
}

export function JobRow({
  job,
  details,
  dragging,
  dropTarget,
  exiting,
  onOpen,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop
}: JobRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = STATUS_ICONS[job.status]
  const pending = job.status === 'pending'
  const processing = job.status === 'processing'
  const classes = ['queue-job', job.status]
  if (dragging) classes.push('dragging')
  if (dropTarget) classes.push('drop-target')
  if (exiting) classes.push('exiting')

  const status = job.skipped ? t('queue.skipped') : t(`queue.status.${job.status}`)
  // `span` y no `div`: va dentro de un `<button>` cuando el trabajo está en proceso.
  const text = (
    <span className="queue-job-text">
      <span className="queue-job-name" title={job.filePath}>
        {job.fileName}
      </span>
      <span className="queue-job-status">
        {status}
        {processing && ` · ${t('common.percent', { value: job.progress ?? 0 })}`}
        {job.error && ` · ${t(`errors.${job.error}`)}`}
      </span>
      <span className="queue-job-details">{details}</span>
      {processing && (
        <span className="queue-job-progress" aria-hidden>
          <span style={{ width: `${job.progress ?? 0}%` }} />
        </span>
      )}
    </span>
  )

  return (
    <li
      className={classes.join(' ')}
      draggable={pending && !exiting}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={(e) => {
        if (!pending) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      // Alt+↑/↓ reordena con el teclado lo mismo que arrastrando.
      onKeyDown={(e) => {
        const delta = reorderKeyDelta(e.key, e.altKey, pending)
        if (delta === 0) return
        e.preventDefault()
        onMove(delta)
      }}
    >
      {pending ? (
        <GripVertical className="queue-job-grip" size={16} strokeWidth={1.5} aria-hidden />
      ) : (
        <span className="queue-job-grip" aria-hidden />
      )}
      <Icon className="queue-job-icon" size={16} strokeWidth={1.75} aria-hidden />
      {processing ? (
        <button className="queue-job-open" title={t('queue.openLive')} onClick={onOpen}>
          {text}
        </button>
      ) : (
        <div
          className="queue-job-open"
          // Enfocable para poder reordenar con Alt+↑/↓.
          tabIndex={pending ? 0 : undefined}
          title={pending ? t('queue.reorderHint') : undefined}
        >
          {text}
        </div>
      )}
      {!processing && (
        <Button
          variant="ghost"
          size="sm"
          className="queue-job-remove"
          aria-label={t('queue.remove', { name: job.fileName })}
          icon={<X size={14} strokeWidth={1.75} />}
          onClick={onRemove}
        />
      )}
    </li>
  )
}
