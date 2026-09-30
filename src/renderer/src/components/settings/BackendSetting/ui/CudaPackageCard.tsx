import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '@renderer/lib/format'
import { useCudaPackage } from '../application/useCudaPackage'
import type { CudaDescription } from '../domain/backend'
import { Button, Card, ConfirmDialog } from '../../../ui'
import DownloadProgress from '../../DownloadProgress'

/**
 * Aceleración NVIDIA (tarea 23.1): con GPU NVIDIA y sin CUDA, ofrece descargar el paquete;
 * si ya está descargado, permite quitarlo. Sin NVIDIA no se muestra.
 */
export function CudaPackageCard(): React.JSX.Element | null {
  const { t, i18n } = useTranslation()
  const cuda = useCudaPackage()
  const { card } = cuda
  if (!card) return null

  const size = (bytes: number): string => formatBytes(bytes, i18n.language)
  const describe = (d: CudaDescription): string => {
    switch (d.kind) {
      case 'ready':
        return t('backend.cudaReady')
      case 'installing':
        return t('backend.cudaInstalling')
      case 'partial':
        return t('models.partial', { received: size(d.received), total: size(d.total) })
      case 'available':
        return t('backend.cudaDescription', { size: size(d.size) })
    }
  }

  return (
    <Card>
      <div className="setting-row">
        <span className="setting-row-icon" aria-hidden>
          <Zap size={20} strokeWidth={1.5} />
        </span>
        <div className="setting-row-text">
          <div className="setting-row-title">{t('backend.cudaTitle')}</div>
          <div className="setting-row-description">{describe(card.description)}</div>
        </div>
        <div className="setting-row-control">
          {card.showCancel ? (
            <Button onClick={cuda.cancel}>{t('common.cancel')}</Button>
          ) : card.showDownload ? (
            <Button variant="primary" onClick={cuda.download}>
              {card.resume ? t('models.resume') : t('models.download')}
            </Button>
          ) : null}
          {card.showDelete && <Button onClick={cuda.askRemove}>{t('models.delete')}</Button>}
        </div>
      </div>
      {card.downloading && (
        <div className="model-row">
          <DownloadProgress
            progress={cuda.progress?.phase === 'downloading' ? cuda.progress : null}
          />
        </div>
      )}

      <ConfirmDialog
        open={cuda.confirmingRemove}
        title={t('backend.cudaRemoveTitle')}
        confirmLabel={t('models.delete')}
        danger
        onConfirm={cuda.confirmRemove}
        onCancel={cuda.cancelRemove}
      >
        {t('backend.cudaRemoveBody')}
      </ConfirmDialog>
    </Card>
  )
}
