import { Fullscreen, PanelTop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DockPosition } from '@shared/dock'
import { usePorts } from '../application/ports'
import { dockPositionOptions } from '../domain/options'
import { Select, SettingRow, Toggle } from '../../../ui'

/**
 * Dónde vive el dock: arriba o abajo, en una esquina o al centro (tarea 33), y si desaparece
 * mientras una app ocupa toda la pantalla (tarea 40).
 */
export function DockSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const position = settings.useDockPosition()
  const hideInFullscreen = settings.useHideInFullscreen()
  const options = dockPositionOptions((value) => t(`settings.dockPositions.${value}`))

  return (
    <>
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
      <SettingRow
        icon={<Fullscreen size={20} strokeWidth={1.5} />}
        title={t('settings.hideDockInFullscreen')}
        description={t('settings.hideDockInFullscreenDescription')}
      >
        <Toggle
          aria-label={t('settings.hideDockInFullscreen')}
          checked={hideInFullscreen}
          onChange={(value) => settings.setHideInFullscreen(value)}
        />
      </SettingRow>
    </>
  )
}
