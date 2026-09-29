import { Download, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUpdatesStore } from '@renderer/store/updates'

/** Botón de la barra de título: aparece solo si hay una versión nueva, se descarga o está lista. */
function UpdateButton(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useUpdatesStore((s) => s.status)
  const { download, install } = useUpdatesStore.getState()

  if (status.state === 'available') {
    return (
      <button
        type="button"
        className="update-button"
        title={t('updates.available', { version: status.version })}
        onClick={() => download().catch(console.error)}
      >
        <Download size={14} strokeWidth={1.75} />
        {t('updates.download')}
      </button>
    )
  }
  if (status.state === 'downloading') {
    const percent = status.total > 0 ? Math.round((status.received / status.total) * 100) : 0
    return (
      <button type="button" className="update-button" disabled>
        <Download size={14} strokeWidth={1.75} />
        {t('updates.downloading')} {percent}%
      </button>
    )
  }
  if (status.state === 'ready') {
    return (
      <button
        type="button"
        className="update-button ready"
        onClick={() => install().catch(console.error)}
      >
        <RefreshCw size={14} strokeWidth={1.75} />
        {t('updates.restart')}
      </button>
    )
  }
  return null
}

export default UpdateButton
