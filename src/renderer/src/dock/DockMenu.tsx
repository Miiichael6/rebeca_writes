import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppWindow, Mic, Power, Square } from 'lucide-react'
import { APP_NAME } from '@shared/app'
import { menuOpensLeft, type DockMenuAction } from '@shared/dock'
import { RECORDING_SOURCES } from '@shared/recording'
import { Menu, type MenuItem } from '@renderer/components/ui'
import { SOURCE_ICONS } from '@renderer/components/MicButton/ui/sourceIcons'
import { recordingName } from '@renderer/lib/recordingName'
import { useMicStore, useMicSync } from '@renderer/store/mic'
import { useSettingsStore, useSettingsSync } from '@renderer/store/settings'
import { useThemeSync } from '@renderer/store/ui'
import { MENU_WINDOW_PADDING_PX, useReportMenuSize } from './application/useReportMenuSize'

const choose = (action: DockMenuAction): void => void window.api.dock.chooseMenu(action)

/** Abre o cierra según el main, que lo abre con clic derecho y lo esconde al perder el foco. */
function useMenuOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    void window.api.dock.menuIsOpen().then(setOpen)
    return window.api.dock.onMenuOpen(setOpen)
  }, [])
  return [open, setOpen]
}

/**
 * La ventana del menú contextual del dock (tarea 30): el `Menu` de la app pegado arriba en una
 * ventana transparente que el main ajusta a lo que ocupa. Menú y submenú se abren hacia dentro
 * de la pantalla: hacia la izquierda, salvo con el dock en la mitad izquierda (tarea 33).
 */
export function DockMenu(): React.JSX.Element {
  useThemeSync()
  useSettingsSync()
  useMicSync()
  const { t } = useTranslation()
  const [open, setOpen] = useMenuOpen()
  const recording = useMicStore((s) => s.state.recording)
  const source = useSettingsStore((s) => s.settings.recordingSource)
  const opensLeft = useSettingsStore((s) => menuOpensLeft(s.settings.dockPosition))
  useReportMenuSize(open, opensLeft)

  const record: MenuItem = recording
    ? {
        key: 'stop',
        label: t('dock.menu.stop'),
        icon: Square,
        onSelect: () => choose({ kind: 'stop' })
      }
    : {
        key: 'record',
        label: t('dock.menu.record'),
        icon: Mic,
        submenu: RECORDING_SOURCES.map((option) => ({
          key: option,
          label: t(`mic.sources.${option}`),
          icon: SOURCE_ICONS[option],
          checked: option === source,
          onSelect: () => choose({ kind: 'record', source: option, name: recordingName(option) })
        }))
      }
  const items: MenuItem[] = [
    {
      key: 'open',
      label: t('dock.menu.open', { app: APP_NAME }),
      icon: AppWindow,
      onSelect: () => choose({ kind: 'open' })
    },
    record,
    {
      key: 'quit',
      label: t('dock.menu.quit'),
      icon: Power,
      separator: true,
      onSelect: () => choose({ kind: 'quit' })
    }
  ]

  return (
    <div
      className="menu-anchor dock-menu-anchor"
      data-opens={opensLeft ? 'left' : 'right'}
      style={{
        top: MENU_WINDOW_PADDING_PX,
        [opensLeft ? 'right' : 'left']: MENU_WINDOW_PADDING_PX
      }}
    >
      <Menu
        open={open}
        onClose={() => {
          setOpen(false)
          choose({ kind: 'close' })
        }}
        placement={opensLeft ? 'bottom-end' : 'bottom-start'}
        aria-label={t('dock.menu.label', { app: APP_NAME })}
        items={items}
      />
    </div>
  )
}
