import { Download, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { downloadPercent } from '../domain/progress'

/** Botón de la barra de título: aparece solo si hay una versión nueva, se descarga o está lista. */
export function UpdateButton(): React.JSX.Element | null {
  const { t } = useTranslation()
  const { updates } = usePorts()
  const status = updates.useStatus()

  if (status.state === 'available') {
    return (
      <button
        type="button"
        className="update-button"
        title={t('updates.available', { version: status.version })}
        onClick={() => updates.download().catch(console.error)}
      >
        <Download size={14} strokeWidth={1.75} />
        {t('updates.download')}
      </button>
    )
  }
  if (status.state === 'downloading') {
    return (
      <button type="button" className="update-button" disabled>
        <Download size={14} strokeWidth={1.75} />
        {t('updates.downloading')} {downloadPercent(status.received, status.total)}%
      </button>
    )
  }
  if (status.state === 'ready') {
    return (
      <button
        type="button"
        className="update-button ready"
        onClick={() => updates.install().catch(console.error)}
      >
        <RefreshCw size={14} strokeWidth={1.75} />
        {t('updates.restart')}
      </button>
    )
  }
  return null
}
