import { UserRoundSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ModelToggleState } from '@renderer/lib/useModelToggle'
import { useSpeakerSetting } from '../application/useSpeakerSetting'
import { SettingRow, Toggle } from '../../../ui'

const DESCRIPTION_KEYS = {
  idle: 'settings.detectSpeakersDescription',
  downloading: 'settings.detectSpeakersDownloading',
  failed: 'settings.detectSpeakersFailed'
} as const satisfies Record<ModelToggleState, string>

/** Interruptor "Detectar quién habla" al grabar (tarea 35). */
export function SpeakerSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { enabled, modelState, setEnabled } = useSpeakerSetting()

  return (
    <SettingRow
      icon={<UserRoundSearch size={20} strokeWidth={1.5} />}
      title={t('settings.detectSpeakers')}
      description={t(DESCRIPTION_KEYS[modelState])}
    >
      <Toggle aria-label={t('settings.detectSpeakers')} checked={enabled} onChange={setEnabled} />
    </SettingRow>
  )
}
