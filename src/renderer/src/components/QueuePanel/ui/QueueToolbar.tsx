import { CircleStop, ListX, Pause, Play, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import type { QueueActions } from '../application/useQueueActions'
import type { QueueView } from '../application/useQueueView'
import { Button } from '../../ui'

interface QueueToolbarProps {
  view: QueueView
  actions: QueueActions
}

/** Agregar, pausar o reanudar, cancelar el actual y limpiar lo terminado. */
export function QueueToolbar({ view, actions }: QueueToolbarProps): React.JSX.Element {
  const { t } = useTranslation()
  const { queue } = usePorts()
  const { paused, resumePending, stats } = view

  return (
    <div className="queue-toolbar">
      <Button
        size="sm"
        icon={<Plus size={16} strokeWidth={1.5} />}
        onClick={() => void actions.addFiles()}
      >
        {t('queue.add')}
      </Button>
      {paused ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('queue.resume')}
          icon={<Play size={16} strokeWidth={1.5} />}
          onClick={() => void queue.resume()}
        />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('queue.pause')}
          icon={<Pause size={16} strokeWidth={1.5} />}
          disabled={resumePending}
          onClick={() => void queue.pause()}
        />
      )}
      <Button
        size="sm"
        variant="ghost"
        aria-label={t('queue.cancelCurrent')}
        icon={<CircleStop size={16} strokeWidth={1.5} />}
        disabled={!stats.processing}
        onClick={() => void queue.cancelCurrent()}
      />
      <Button
        size="sm"
        variant="ghost"
        aria-label={t('queue.clearCompleted')}
        icon={<ListX size={16} strokeWidth={1.5} />}
        disabled={!stats.finished}
        onClick={() => void queue.clearCompleted()}
      />
    </div>
  )
}
