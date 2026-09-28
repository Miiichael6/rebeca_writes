import { FolderOpen, HardDrive, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '@renderer/lib/format'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { Button, NumberInput, SettingRow } from '../ui'

/** Almacenamiento: carpeta de modelos y caché de vistas previas (H.264 para códecs no nativos). */
function StorageSettings(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const limitGB = useSettingsStore((s) => s.settings.previewCacheMaxGB)
  const [modelsDir, setModelsDir] = useState('')
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  const refreshSize = useCallback(async () => {
    setCacheSize(await window.api.media.getPreviewCacheSize())
  }, [])

  useEffect(() => {
    window.api.app.getModelsDir().then(setModelsDir, console.error)
    window.api.media.getPreviewCacheSize().then(setCacheSize, console.error)
  }, [])

  const clear = async (): Promise<void> => {
    setClearing(true)
    try {
      await window.api.media.clearPreviewCache()
      toast(t('settings.previewCacheCleared'))
    } catch (err) {
      console.error('No se pudo vaciar la caché', err)
    } finally {
      await refreshSize().catch(console.error)
      setClearing(false)
    }
  }

  return (
    <>
      <SettingRow
        icon={<FolderOpen size={20} strokeWidth={1.5} />}
        title={t('settings.modelsFolder')}
        description={<span className="setting-path">{modelsDir}</span>}
      >
        <Button onClick={() => window.api.app.openModelsDir().catch(console.error)}>
          {t('settings.openFolder')}
        </Button>
      </SettingRow>
      <SettingRow
        icon={<HardDrive size={20} strokeWidth={1.5} />}
        title={t('settings.previewCache')}
        description={t('settings.previewCacheDescription', {
          size: cacheSize === null ? '…' : formatBytes(cacheSize, i18n.language)
        })}
      >
        <label className="setting-inline">
          {t('settings.previewCacheLimit')}
          <NumberInput
            aria-label={t('settings.previewCacheLimit')}
            value={limitGB}
            min={1}
            max={1000}
            onChange={(value) => updateSettings({ previewCacheMaxGB: value })}
          />
        </label>
        <Button
          variant="danger"
          icon={<Trash2 size={16} strokeWidth={1.5} />}
          disabled={clearing || cacheSize === 0}
          onClick={clear}
        >
          {t('settings.previewCacheClear')}
        </Button>
      </SettingRow>
    </>
  )
}

export default StorageSettings
