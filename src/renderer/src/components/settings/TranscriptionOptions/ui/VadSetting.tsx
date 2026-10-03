import { AudioWaveform } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ModelToggleState } from '@renderer/lib/useModelToggle'
import { useVadSetting } from '../application/useVadSetting'
import { SettingRow, Toggle } from '../../../ui'

const DESCRIPTION_KEYS = {
  idle: 'settings.vadDescription',
  downloading: 'settings.vadDownloading',
  failed: 'settings.vadFailed'
} as const satisfies Record<ModelToggleState, string>

/** Interruptor "Filtrar silencios y ruido": whisper solo transcribe los tramos con voz. */
export function VadSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const { enabled, modelState, setEnabled } = useVadSetting()

  return (
    <SettingRow
      icon={<AudioWaveform size={20} strokeWidth={1.5} />}
      title={t('settings.vad')}
      description={t(DESCRIPTION_KEYS[modelState])}
    >
      <Toggle aria-label={t('settings.vad')} checked={enabled} onChange={setEnabled} />
    </SettingRow>
  )
}
