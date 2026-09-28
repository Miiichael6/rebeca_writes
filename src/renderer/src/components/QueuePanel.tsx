import { CircleAlert, CircleCheck, CircleDashed, CircleSlash, LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobStatus, QueueJob } from '@shared/types'
import { useQueueStore } from '@renderer/store/queue'
import { useUiStore } from '@renderer/store/ui'
import { Button } from './ui'

const STATUS_ICONS: Record<JobStatus, typeof X> = {
  pending: CircleDashed,
  processing: LoaderCircle,
  completed: CircleCheck,
  error: CircleAlert,
  cancelled: CircleSlash
}

function JobRow({ job }: { job: QueueJob }): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = STATUS_ICONS[job.status]
  return (
    <li className={`queue-job ${job.status}`}>
      <Icon className="queue-job-icon" size={16} strokeWidth={1.75} aria-hidden />
      <div className="queue-job-text">
        <div className="queue-job-name" title={job.fileName}>
          {job.fileName}
        </div>
        <div className="queue-job-status">
          {t(`queue.status.${job.status}`)}
          {job.status === 'processing' && ` · ${t('common.percent', { value: job.progress ?? 0 })}`}
          {job.error && ` · ${t(`errors.${job.error}`)}`}
        </div>
        {job.status === 'processing' && (
          <div className="queue-job-progress" aria-hidden>
            <div style={{ width: `${job.progress ?? 0}%` }} />
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Panel lateral de la cola, sobre `<dialog>` modal (foco atrapado, Esc cierra). Muestra los
 * trabajos de ejemplo; reordenar, pausar, quitar y demás acciones son de la tarea 17.
 */
function QueuePanel(): React.JSX.Element {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.queueOpen)
  const setQueueOpen = useUiStore((s) => s.setQueueOpen)
  const jobs = useQueueStore((s) => s.jobs)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="queue-title"
      onCancel={(e) => {
        e.preventDefault()
        setQueueOpen(false)
      }}
      // Clic en el fondo (fuera del contenido) cierra.
      onClick={(e) => e.target === e.currentTarget && setQueueOpen(false)}
    >
      <div className="drawer-content">
        <header className="drawer-header">
          <h2 id="queue-title">{t('queue.title')}</h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('common.close')}
            icon={<X size={16} strokeWidth={1.5} />}
            onClick={() => setQueueOpen(false)}
          />
        </header>
        {jobs.length === 0 ? (
          <p className="drawer-empty">{t('queue.empty')}</p>
        ) : (
          <ul className="queue-list">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}

export default QueuePanel
