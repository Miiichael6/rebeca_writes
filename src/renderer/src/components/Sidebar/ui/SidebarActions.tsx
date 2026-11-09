import { Eraser, FolderInput, FolderOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { Button } from '../../ui'

interface SidebarActionsProps {
  collapsed: boolean
  totalCount: number
  onAskClear: () => void
  onOpenFolder: () => void
}

/** Barra superior: acciones habituales (la selección múltiple tiene su barra al pie). */
export function SidebarActions({
  collapsed,
  totalCount,
  onAskClear,
  onOpenFolder
}: SidebarActionsProps): React.JSX.Element {
  const { t } = useTranslation()
  const { history, layout } = usePorts()

  return (
    <div className="sidebar-actions">
      <Button
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-expanded={!collapsed}
        icon={
          collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.5} />
          )
        }
        onClick={layout.toggleCollapsed}
      />
      <Button
        className="sidebar-open-file"
        icon={<FolderOpen size={16} strokeWidth={1.5} />}
        title={`${t('sidebar.openFile')} (Ctrl+O)`}
        aria-label={collapsed ? t('sidebar.openFile') : undefined}
        aria-keyshortcuts="Control+O"
        onClick={() => void history.openFile()}
      >
        {collapsed ? null : t('sidebar.openFile')}
      </Button>
      <Button
        aria-label={t('sidebar.openFolder')}
        title={t('sidebar.openFolder')}
        icon={<FolderInput size={16} strokeWidth={1.5} />}
        onClick={onOpenFolder}
      />
      {!collapsed && (
        <Button
          aria-label={t('sidebar.clearHistory')}
          icon={<Eraser size={16} strokeWidth={1.5} />}
          disabled={totalCount === 0}
          onClick={onAskClear}
        />
      )}
    </div>
  )
}
