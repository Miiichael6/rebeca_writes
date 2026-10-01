import { FolderOpen, HardDrive, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '@renderer/lib/format'
import { usePorts } from '../application/ports'
import { useModelsDir } from '../application/useModelsDir'
import { usePreviewCache } from '../application/usePreviewCache'
import { Button, NumberInput, SettingRow } from '../../../ui'

/** Almacenamiento: carpeta de modelos y caché de vistas previas (H.264 para códecs no nativos). */
export function StorageSettings(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { settings, notify } = usePorts()
  const limitGB = settings.useCacheLimitGB()
  const modelsDir = useModelsDir()
  const cache = usePreviewCache(() => notify.notify(t('settings.previewCacheCleared')))

  return (
    <>
      <SettingRow
        icon={<FolderOpen size={20} strokeWidth={1.5} />}
        title={t('settings.modelsFolder')}
        description={<span className="setting-path">{modelsDir.path}</span>}
      >
        <Button onClick={modelsDir.open}>{t('settings.openFolder')}</Button>
      </SettingRow>
      <SettingRow
        icon={<HardDrive size={20} strokeWidth={1.5} />}
        title={t('settings.previewCache')}
        description={t('settings.previewCacheDescription', {
          size: cache.size === null ? '…' : formatBytes(cache.size, i18n.language)
        })}
      >
        <label className="setting-inline">
          {t('settings.previewCacheLimit')}
          <NumberInput
            aria-label={t('settings.previewCacheLimit')}
            value={limitGB}
            min={1}
            max={1000}
            onChange={settings.setCacheLimitGB}
          />
        </label>
        <Button
          variant="danger"
          icon={<Trash2 size={16} strokeWidth={1.5} />}
          disabled={cache.clearing || cache.size === 0}
          onClick={cache.clear}
        >
          {t('settings.previewCacheClear')}
        </Button>
      </SettingRow>
    </>
  )
}
