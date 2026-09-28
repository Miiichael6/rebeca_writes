import { Cpu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Backend, BackendInfo } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { RadioGroup, SettingRow } from '../ui'

/** Modelos › Backend (Screenshot_25): radios CUDA / GPU / CPU con el detectado marcado. */
function BackendSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const chosen = useSettingsStore((s) => s.settings.backend)
  const [info, setInfo] = useState<BackendInfo | null>(null)

  useEffect(() => {
    let alive = true
    window.api.backend
      .getInfo()
      .then((i) => alive && setInfo(i))
      .catch((err) => console.error('No se pudo leer el backend', err))
    return () => {
      alive = false
    }
  }, [])

  // Lo mismo que decide el main al transcribir: el elegido si está instalado, si no el detectado.
  const active: Backend | null = info
    ? chosen && info.installed.includes(chosen)
      ? chosen
      : info.detected
    : chosen

  const options = BACKEND_ORDER.map((backend) => {
    const installed = info ? info.installed.includes(backend) : true
    const description = t(`settings.backendOptions.${backend}.description`)
    return {
      value: backend,
      label: t(`settings.backendOptions.${backend}.label`),
      description: installed ? description : `${description} ${t('settings.backendNotInstalled')}`,
      badge: info?.detected === backend ? t('settings.backendDetected') : undefined,
      disabled: !installed
    }
  })

  return (
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
  )
}

export default BackendSetting
