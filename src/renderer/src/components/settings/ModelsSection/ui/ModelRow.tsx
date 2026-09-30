import { useTranslation } from 'react-i18next'
import type { ModelStatus } from '@shared/models'
import { formatBytes } from '@renderer/lib/format'
import { usePorts } from '../application/ports'
import { memoryLevel, rowActions, sizeInfo } from '../domain/model'
import { Button } from '../../../ui'
import DownloadProgress from '../../DownloadProgress'

interface ModelRowProps {
  model: ModelStatus
  onDelete: (model: ModelStatus) => void
}

export function ModelRow({ model, onDelete }: ModelRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { models } = usePorts()
  const progress = models.useProgress(model.id)
  const size = (bytes: number): string => formatBytes(bytes, i18n.language)
  const actions = rowActions(model)
  const info = sizeInfo(model)

  const sizeText =
    info.kind === 'size'
      ? size(info.bytes)
      : info.kind === 'fileMissing'
        ? t('models.fileMissing')
        : t('models.partial', { received: size(info.received), total: size(info.total) })

  return (
    <div className="model-row">
      <div className="model-row-main">
        <div className="model-row-text">
          <div className="model-row-name">{model.label}</div>
          {model.custom ? (
            <div className="model-row-meta" title={model.path}>
              {model.path}
            </div>
          ) : (
            <div className="model-row-meta">
              <span>
                {t('models.speed')} <b>{t(`models.speeds.${model.speed!}`)}</b>
              </span>
              <span>
                {t('models.accuracy')} <b>{t(`models.accuracies.${model.accuracy!}`)}</b>
              </span>
              <span>
                {t('models.memory')}{' '}
                <b>
                  {t('models.memoryValue', {
                    level: t(`models.memoryLevels.${memoryLevel(model.memoryGb!)}`),
                    gb: model.memoryGb
                  })}
                </b>
              </span>
            </div>
          )}
        </div>
        {!actions.cancel && <span className="model-row-size">{sizeText}</span>}
        {actions.cancel ? (
          <Button onClick={() => models.cancel(model.id)}>{t('common.cancel')}</Button>
        ) : actions.download ? (
          <Button variant="primary" onClick={() => void models.download(model.id)}>
            {actions.resume ? t('models.resume') : t('models.download')}
          </Button>
        ) : null}
        {actions.remove && (
          <Button onClick={() => onDelete(model)}>
            {model.custom ? t('models.remove') : t('models.delete')}
          </Button>
        )}
      </div>
      {actions.cancel && <DownloadProgress progress={progress} />}
    </div>
  )
}
