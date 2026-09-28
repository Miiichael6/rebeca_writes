import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleStop,
  GripVertical,
  ListX,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobStatus, QueueJob } from '@shared/types'
import { AUTO_LANGUAGE, languageTag } from '@shared/whisper'
import { filterLabels, useHistoryStore } from '@renderer/store/history'
import { useModelsStore } from '@renderer/store/models'
import { moveJob } from '@renderer/lib/queueOrder'
import { reorderQueue, useQueueStore } from '@renderer/store/queue'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useUiStore } from '@renderer/store/ui'
import { Button, Checkbox, ConfirmDialog } from './ui'

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
  onOpen: () => void
  onRemove: () => void
  onMove: (delta: -1 | 1) => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onDrop: () => void
}

function JobRow({
  job,
  details,
  dragging,
  dropTarget,
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
      draggable={pending}
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
        if (!pending || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
        e.preventDefault()
        onMove(e.key === 'ArrowUp' ? -1 : 1)
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

/**
 * Panel lateral de la cola, sobre `<dialog>` modal (foco atrapado, Esc cierra). La cola
 * vive en el main; aquí se ve su estado y se piden las acciones.
 */
function QueuePanel(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const open = useUiStore((s) => s.queueOpen)
  const setQueueOpen = useUiStore((s) => s.setQueueOpen)
  const jobs = useQueueStore((s) => s.jobs)
  const paused = useQueueStore((s) => s.paused)
  const resumePending = useQueueStore((s) => s.resumePending)
  const options = useSettingsStore((s) => s.settings.queue)
  const models = useModelsStore((s) => s.models)
  const ref = useRef<HTMLDialogElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const describe = useMemo(() => {
    const names = new Intl.DisplayNames([i18n.language], { type: 'language', fallback: 'code' })
    const modelLabel = new Map(models.map((m) => [m.id, m.label]))
    return (job: QueueJob): string => {
      const language =
        job.language === AUTO_LANGUAGE
          ? t('toolbar.autoDetect')
          : (names.of(languageTag(job.language)) ?? job.language)
      return [
        modelLabel.get(job.model) ?? job.model,
        language,
        ...(job.translate ? [t('queue.translated')] : [])
      ].join(' · ')
    }
  }, [models, i18n.language, t])

  const processing = jobs.some((j) => j.status === 'processing')
  const pendingCount = jobs.filter((j) => j.status === 'pending').length
  const finished = jobs.some((j) => j.status !== 'pending' && j.status !== 'processing')

  const addFiles = async (): Promise<void> => {
    try {
      const { added } = await window.api.queue.pickFiles(filterLabels())
      if (added > 0) toast(t('queue.added', { count: added }))
    } catch (err) {
      console.error('No se pudieron agregar archivos a la cola', err)
    }
  }

  const move = (id: string, targetId: string | undefined): void => {
    const ids = targetId ? moveJob(jobs, id, targetId) : null
    if (ids) reorderQueue(ids)
  }

  const openJob = async (id: string): Promise<void> => {
    if (await useHistoryStore.getState().openQueueJob(id)) {
      useUiStore.getState().setView('main')
      setQueueOpen(false)
    }
  }

  return (
    <>
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

          <div className="queue-toolbar">
            <Button
              size="sm"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={() => void addFiles()}
            >
              {t('queue.add')}
            </Button>
            {paused ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t('queue.resume')}
                icon={<Play size={16} strokeWidth={1.5} />}
                onClick={() => void window.api.queue.resume()}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t('queue.pause')}
                icon={<Pause size={16} strokeWidth={1.5} />}
                disabled={resumePending}
                onClick={() => void window.api.queue.pause()}
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('queue.cancelCurrent')}
              icon={<CircleStop size={16} strokeWidth={1.5} />}
              disabled={!processing}
              onClick={() => void window.api.queue.cancelCurrent()}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('queue.clearCompleted')}
              icon={<ListX size={16} strokeWidth={1.5} />}
              disabled={!finished}
              onClick={() => void window.api.queue.clearCompleted()}
            />
          </div>

          <div className="queue-options">
            <Checkbox
              checked={options.skipExistingSrt}
              onChange={(skipExistingSrt) => updateSettings({ queue: { skipExistingSrt } })}
            >
              {t('queue.skipExistingSrt')}
            </Checkbox>
            <Checkbox
              checked={options.autoSaveSrt}
              onChange={(autoSaveSrt) => updateSettings({ queue: { autoSaveSrt } })}
            >
              {t('queue.autoSaveSrt')}
            </Checkbox>
          </div>

          {paused && pendingCount > 0 && (
            <p className="queue-paused" role="status">
              {t('queue.pausedNotice', { count: pendingCount })}
            </p>
          )}

          {jobs.length === 0 ? (
            <p className="drawer-empty">{t('queue.empty')}</p>
          ) : (
            <ul className="queue-list" onDragLeave={() => setOverId(null)}>
              {jobs.map((job, index) => (
                <JobRow
                  key={job.id}
                  job={job}
                  details={describe(job)}
                  dragging={dragId === job.id}
                  dropTarget={overId === job.id && dragId !== null && dragId !== job.id}
                  onOpen={() => void openJob(job.id)}
                  onRemove={() => void window.api.queue.remove(job.id)}
                  onMove={(delta) => move(job.id, jobs[index + delta]?.id)}
                  onDragStart={() => setDragId(job.id)}
                  onDragOver={() => setOverId(job.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  onDrop={() => {
                    if (dragId) move(dragId, job.id)
                    setDragId(null)
                    setOverId(null)
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </dialog>

      <ConfirmDialog
        open={resumePending}
        title={t('queue.resumeTitle')}
        confirmLabel={t('queue.resumeConfirm')}
        cancelLabel={t('queue.resumeDiscard')}
        focusConfirm
        onConfirm={() => void window.api.queue.resume()}
        onCancel={() => void window.api.queue.discard()}
      >
        {t('queue.resumeBody', { count: pendingCount })}
      </ConfirmDialog>
    </>
  )
}

export default QueuePanel
