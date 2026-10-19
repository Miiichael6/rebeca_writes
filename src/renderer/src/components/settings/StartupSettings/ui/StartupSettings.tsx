import { Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { SettingRow, Toggle } from '../../../ui'

/** Interruptor para abrir la app (solo el dock) al iniciar Windows (tarea 40). */
export function StartupSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const enabled = settings.useOpenAtLogin()

  return (
    <SettingRow
      icon={<Power size={20} strokeWidth={1.5} />}
      title={t('settings.openAtLogin')}
      description={t('settings.openAtLoginDescription')}
    >
      <Toggle
        aria-label={t('settings.openAtLogin')}
        checked={enabled}
        onChange={(value) => settings.setOpenAtLogin(value)}
      />
    </SettingRow>
  )
}
