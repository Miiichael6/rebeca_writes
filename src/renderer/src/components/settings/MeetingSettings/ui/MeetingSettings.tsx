import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { SettingRow, Toggle } from '../../../ui'

/** Interruptor para que el dock pregunte si grabar al empezar una llamada (tarea 32, D12). */
export function MeetingSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const enabled = settings.useSuggestMeetings()

  return (
    <SettingRow
      icon={<Users size={20} strokeWidth={1.5} />}
      title={t('settings.suggestMeetings')}
      description={t('settings.suggestMeetingsDescription')}
    >
      <Toggle
        aria-label={t('settings.suggestMeetings')}
        checked={enabled}
        onChange={(value) => settings.setSuggestMeetings(value)}
      />
    </SettingRow>
  )
}
