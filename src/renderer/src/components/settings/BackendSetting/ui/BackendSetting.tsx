import { Cpu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { usePorts } from '../application/ports'
import { activeBackend, backendOptionState } from '../domain/backend'
import { RadioGroup, SettingRow } from '../../../ui'
import { CudaPackageCard } from './CudaPackageCard'

/** Modelos › Backend (Screenshot_25): radios CUDA / GPU / CPU con el detectado marcado. */
export function BackendSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const { backend, settings } = usePorts()
  const chosen = settings.useChosen()
  const info = backend.useInfo()
  const active = activeBackend(chosen, info)

  const options = BACKEND_ORDER.map((b) => {
    const state = backendOptionState(b, info)
    const description = t(`settings.backendOptions.${b}.description`)
    const missing = state.downloadable
      ? t('backend.cudaNotDownloaded')
      : t('settings.backendNotInstalled')
    return {
      value: b,
      label: t(`settings.backendOptions.${b}.label`),
      description: state.installed ? description : `${description} ${missing}`,
      badge: state.detected ? t('settings.backendDetected') : undefined,
      disabled: !state.installed
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
              onChange={settings.choose}
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
