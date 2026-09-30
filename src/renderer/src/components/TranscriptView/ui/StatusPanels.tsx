import { CircleAlert, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatClock } from '@renderer/lib/time'
import { usePorts } from '../application/ports'

/** Barra fina bajo el encabezado mientras se transcribe el archivo abierto. */
export function ProgressBar(): React.JSX.Element | null {
  const { t } = useTranslation()
  const job = usePorts().transcript.useLiveProgress()
  if (!job) return null
  const progress = Math.round(job.progress)
  return (
    <div className="transcript-progress">
      <span className="transcript-progress-phase">
        {job.phase === 'preparing'
          ? t('transcript.phasePreparing')
          : t('transcript.phaseTranscribing')}
      </span>
      <div
        className="transcript-progress-bar"
        role="progressbar"
        aria-label={t('transcript.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="transcript-progress-text">
        {t('common.percent', { value: progress })}
        {job.etaSec !== null &&
          ` · ${t('transcript.remaining', { time: formatClock(job.etaSec) })}`}
      </span>
    </div>
  )
}

/** Aviso fijo cuando la última transcripción del archivo abierto falló. */
export function ErrorBanner(): React.JSX.Element | null {
  const { t } = useTranslation()
  const { transcript } = usePorts()
  const status = transcript.useStatus()
  const error = transcript.useError()
  if (status !== 'error') return null
  return (
    <div className="transcript-error" role="alert">
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
      <span>{error ? t(`errors.${error}`) : t('transcript.failed')}</span>
    </div>
  )
}

export function EmptyState(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = usePorts().transcript.useStatus()
  switch (status) {
    case 'idle':
      return (
        <div className="empty">
          <FolderOpen size={32} strokeWidth={1.25} aria-hidden />
          <p>{t('transcript.emptyIdle')}</p>
        </div>
      )
    case 'ready':
      return (
        <div className="empty">
          <p>{t('transcript.emptyReady')}</p>
        </div>
      )
    case 'transcribing':
      return (
        <div className="empty">
          <p>{t('transcript.emptyWaiting')}</p>
        </div>
      )
    default:
      return null
  }
}
