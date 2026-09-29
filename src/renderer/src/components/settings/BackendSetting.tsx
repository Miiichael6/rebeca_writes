import { Cpu, Zap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { formatBytes } from '@renderer/lib/format'
import { useBackendStore } from '@renderer/store/backend'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { Button, Card, ConfirmDialog, RadioGroup, SettingRow } from '../ui'
import DownloadProgress from './DownloadProgress'

/**
 * Aceleración NVIDIA (tarea 23.1): con GPU NVIDIA y sin CUDA, ofrece descargar el paquete;
 * si ya está descargado, permite quitarlo. Sin NVIDIA no se muestra.
 */
function CudaPackageCard(): React.JSX.Element | null {
  const { t, i18n } = useTranslation()
  const info = useBackendStore((s) => s.info)
  const cuda = useBackendStore((s) => s.cuda)
  const progress = useBackendStore((s) => s.progress)
  const { downloadCuda, cancelCuda, removeCuda } = useBackendStore.getState()
  const [confirming, setConfirming] = useState(false)

  if (!info || !cuda) return null
  const busy = cuda.state === 'downloading' || cuda.state === 'installing'
  if (!info.cudaDownloadable && !cuda.removable && !busy) return null

  const size = formatBytes(cuda.sizeBytes, i18n.language)
  const partial = cuda.state === 'missing' && cuda.partBytes > 0
  let description: string
  if (cuda.state === 'installed') description = t('backend.cudaReady')
  else if (cuda.state === 'installing') description = t('backend.cudaInstalling')
  else if (partial)
    description = t('models.partial', {
      received: formatBytes(cuda.partBytes, i18n.language),
      total: size
    })
  else description = t('backend.cudaDescription', { size })

  return (
    <Card>
      <div className="setting-row">
        <span className="setting-row-icon" aria-hidden>
          <Zap size={20} strokeWidth={1.5} />
        </span>
        <div className="setting-row-text">
          <div className="setting-row-title">{t('backend.cudaTitle')}</div>
          <div className="setting-row-description">{description}</div>
        </div>
        <div className="setting-row-control">
          {cuda.state === 'downloading' ? (
            <Button onClick={cancelCuda}>{t('common.cancel')}</Button>
          ) : cuda.state === 'missing' ? (
            <Button variant="primary" onClick={() => downloadCuda()}>
              {partial ? t('models.resume') : t('models.download')}
            </Button>
          ) : null}
          {(cuda.removable || partial) && (
            <Button onClick={() => setConfirming(true)}>{t('models.delete')}</Button>
          )}
        </div>
      </div>
      {cuda.state === 'downloading' && (
        <div className="model-row">
          <DownloadProgress progress={progress?.phase === 'downloading' ? progress : null} />
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('backend.cudaRemoveTitle')}
        confirmLabel={t('models.delete')}
        danger
        onConfirm={() => {
          setConfirming(false)
          removeCuda()
        }}
        onCancel={() => setConfirming(false)}
      >
        {t('backend.cudaRemoveBody')}
      </ConfirmDialog>
    </Card>
  )
}

/** Modelos › Backend (Screenshot_25): radios CUDA / GPU / CPU con el detectado marcado. */
function BackendSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const chosen = useSettingsStore((s) => s.settings.backend)
  const info = useBackendStore((s) => s.info)

  // Lo mismo que decide el main al transcribir: el elegido si está instalado, si no el detectado.
  const active: Backend | null = info
    ? chosen && info.installed.includes(chosen)
      ? chosen
      : info.detected
    : chosen

  const options = BACKEND_ORDER.map((backend) => {
    const installed = info ? info.installed.includes(backend) : true
    const description = t(`settings.backendOptions.${backend}.description`)
    const missing =
      backend === 'cuda' && info?.cudaDownloadable
        ? t('backend.cudaNotDownloaded')
        : t('settings.backendNotInstalled')
    return {
      value: backend,
      label: t(`settings.backendOptions.${backend}.label`),
      description: installed ? description : `${description} ${missing}`,
      badge: info?.detected === backend ? t('settings.backendDetected') : undefined,
      disabled: !installed
    }
  })

  return (
    <>
      <SettingRow
        icon={<Cpu size={20} strokeWidth={1.5} />}
        title={t('settings.backend')}
        description={t('settings.backendDescription')}
        extra={
          active && (
            <RadioGroup<Backend>
              aria-label={t('settings.backend')}
              value={active}
              onChange={(backend) => updateSettings({ backend })}
              options={options}
            />
          )
        }
      >
        {active && (
          <span className="setting-value">{t(`settings.backendOptions.${active}.label`)}</span>
        )}
      </SettingRow>
      <CudaPackageCard />
    </>
  )
}

export default BackendSetting
