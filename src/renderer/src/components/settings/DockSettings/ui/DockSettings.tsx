import { PanelTop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DockPosition } from '@shared/dock'
import { usePorts } from '../application/ports'
import { dockPositionOptions } from '../domain/options'
import { Select, SettingRow } from '../../../ui'

/** Dónde vive el dock: borde lateral, o arriba o abajo en una esquina o al centro (tarea 33). */
export function DockSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const position = settings.useDockPosition()
  const options = dockPositionOptions((value) => t(`settings.dockPositions.${value}`))

  return (
    <SettingRow
      icon={<PanelTop size={20} strokeWidth={1.5} />}
      title={t('settings.dockPosition')}
      description={t('settings.dockPositionDescription')}
    >
      <Select<DockPosition>
        aria-label={t('settings.dockPosition')}
        value={position}
        onChange={(value) => settings.setDockPosition(value)}
        options={options}
      />
    </SettingRow>
  )
}
