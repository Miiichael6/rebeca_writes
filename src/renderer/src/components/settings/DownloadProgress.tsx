import { useTranslation } from 'react-i18next'
import { formatBytes } from '@renderer/lib/format'
import { formatClock } from '@renderer/lib/time'

/** Lo que hace falta de `ModelProgress` o `CudaProgress`. */
interface Progress {
  received: number
  total: number
  bytesPerSec: number
  etaSec: number | null
}

/** Barra de una descarga con "X de Y · velocidad" y el tiempo restante. */
function DownloadProgress({ progress }: { progress?: Progress | null }): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const received = progress?.received ?? 0
  const total = progress?.total ?? 0
  const percent = total > 0 ? (received / total) * 100 : 0
  return (
    <div className="model-progress">
      <div
        className="model-progress-bar"
        role="progressbar"
        aria-label={t('models.downloading')}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <span className="model-progress-text">
        {progress
          ? t('models.progress', {
              received: formatBytes(received, i18n.language),
              total: formatBytes(total, i18n.language),
              speed: formatBytes(progress.bytesPerSec, i18n.language)
            })
          : t('models.starting')}
        {progress?.etaSec != null &&
          ` · ${t('transcript.remaining', { time: formatClock(progress.etaSec) })}`}
      </span>
    </div>
  )
}

export default DownloadProgress
