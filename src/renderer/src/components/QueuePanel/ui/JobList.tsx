import { useTranslation } from 'react-i18next'
import type { QueueView } from '../application/useQueueView'
import { useJobDescriber } from '../application/useQueueView'
import { useJobReorder } from '../application/useJobReorder'
import type { QueueActions } from '../application/useQueueActions'
import { usePorts } from '../application/ports'
import { isDropTarget } from '../domain/jobs'
import { JobRow } from './JobRow'

interface JobListProps {
  view: QueueView
  actions: QueueActions
}

/** Lista de trabajos, o el aviso de cola vacía. */
export function JobList({ view, actions }: JobListProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { queue } = usePorts()
  const reorder = useJobReorder(view.jobs)
  const describe = useJobDescriber({
    language: i18n.language,
    autoLabel: t('toolbar.autoDetect'),
    translatedLabel: t('queue.translated')
  })

  if (view.rows.items.length === 0) return <p className="drawer-empty">{t('queue.empty')}</p>

  return (
    <ul className="queue-list" onDragLeave={reorder.leaveList}>
      {view.rows.items.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          details={describe(job)}
          dragging={reorder.dragId === job.id}
          dropTarget={isDropTarget(reorder.overId, reorder.dragId, job.id)}
          exiting={view.rows.exiting.has(job.id)}
          onOpen={() => void actions.openJob(job.id)}
          onRemove={() => void queue.remove(job.id)}
          onMove={(delta) => reorder.moveBy(job.id, delta)}
          onDragStart={() => reorder.startDrag(job.id)}
          onDragOver={() => reorder.overRow(job.id)}
          onDragEnd={reorder.endDrag}
          onDrop={() => reorder.dropOn(job.id)}
        />
      ))}
    </ul>
  )
}
