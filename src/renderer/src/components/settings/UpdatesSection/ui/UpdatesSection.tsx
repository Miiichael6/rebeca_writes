import { useTranslation } from 'react-i18next'
import { formatBytes } from '@renderer/lib/format'
import { usePorts } from '../application/ports'
import { isBusy, UPDATE_ERROR_KEYS } from '../domain/updates'
import { Button, Toggle } from '../../../ui'
import DownloadProgress from '../../DownloadProgress'

/** Buscar actualizaciones: estado, descarga, reinicio y ajuste de búsqueda al iniciar. */
export function UpdatesSection(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { updates, settings } = usePorts()
  const status = updates.useStatus()
  const autoCheck = settings.useAutoCheck()

  let message = ''
  if (status.state === 'checking') message = t('updates.checking')
  else if (status.state === 'upToDate') message = t('updates.upToDate')
  else if (status.state === 'available') {
    message = t('updates.available', { version: status.version })
  } else if (status.state === 'ready') message = t('updates.ready')
  else if (status.state === 'error') message = t(`errors.${UPDATE_ERROR_KEYS[status.code]}`)

  return (
    <div className="about-updates">
      <div className="about-updates-row">
        <Button disabled={isBusy(status)} onClick={() => updates.check().catch(console.error)}>
          {t('updates.check')}
        </Button>
        {status.state === 'available' && (
          <Button variant="primary" onClick={() => updates.download().catch(console.error)}>
            {t('updates.download')} ({formatBytes(status.sizeBytes, i18n.language)})
          </Button>
        )}
        {status.state === 'ready' && (
          <Button variant="primary" onClick={() => updates.install().catch(console.error)}>
            {t('updates.restart')}
          </Button>
        )}
        <span
          className={`about-updates-status${status.state === 'error' ? ' error' : ''}`}
          role="status"
        >
          {message}
        </span>
      </div>
      {status.state === 'downloading' && <DownloadProgress progress={status} />}
      {status.state === 'available' && status.releaseNotes && (
        <details className="about-notes">
          <summary>{t('updates.notes')}</summary>
          <pre>{status.releaseNotes}</pre>
        </details>
      )}
      <label className="about-updates-auto">
        <Toggle
          aria-label={t('updates.autoCheck')}
          checked={autoCheck}
          onChange={(value) => settings.setAutoCheck(value)}
        />
        <span>{t('updates.autoCheck')}</span>
      </label>
    </div>
  )
}
