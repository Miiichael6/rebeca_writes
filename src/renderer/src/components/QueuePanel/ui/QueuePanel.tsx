import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useModalDialog } from '@renderer/lib/useModalDialog'
import { usePorts } from '../application/ports'
import { useQueueActions } from '../application/useQueueActions'
import { useQueueView } from '../application/useQueueView'
import { Button, ConfirmDialog } from '../../ui'
import { JobList } from './JobList'
import { QueueOptions } from './QueueOptions'
import { QueueToolbar } from './QueueToolbar'

/**
 * Panel lateral de la cola, sobre `<dialog>` modal (foco atrapado, Esc cierra). La cola
 * vive en el main; aquí se ve su estado y se piden las acciones.
 */
export function QueuePanel(): React.JSX.Element {
  const { t } = useTranslation()
  const { panel, queue } = usePorts()
  const open = panel.useOpen()
  const view = useQueueView()
  const actions = useQueueActions()
  const { ref, state } = useModalDialog(open)
  const close = (): void => panel.setOpen(false)

  return (
    <>
      <dialog
        ref={ref}
        className={`drawer ${state}`}
        aria-labelledby="queue-title"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        // Clic en el fondo (fuera del contenido) cierra.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="drawer-content">
          <header className="drawer-header">
            <h2 id="queue-title">{t('queue.title')}</h2>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('common.close')}
              icon={<X size={16} strokeWidth={1.5} />}
              onClick={close}
            />
          </header>

          <QueueToolbar view={view} actions={actions} />
          <QueueOptions />

          {view.paused && view.stats.pendingCount > 0 && (
            <p className="queue-paused" role="status">
              {t('queue.pausedNotice', { count: view.stats.pendingCount })}
            </p>
          )}

          <JobList view={view} actions={actions} />
        </div>
      </dialog>

      <ConfirmDialog
        open={view.resumePending}
        title={t('queue.resumeTitle')}
        confirmLabel={t('queue.resumeConfirm')}
        cancelLabel={t('queue.resumeDiscard')}
        focusConfirm
        onConfirm={() => void queue.resume()}
        onCancel={() => void queue.discard()}
      >
        {t('queue.resumeBody', { count: view.stats.pendingCount })}
      </ConfirmDialog>
    </>
  )
}
