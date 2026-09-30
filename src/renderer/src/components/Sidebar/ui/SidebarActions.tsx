import { Check, Eraser, FolderOpen, PanelLeftClose, PanelLeftOpen, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import type { MultiSelect } from '../application/useMultiSelect'
import { Button } from '../../ui'

interface SidebarActionsProps {
  collapsed: boolean
  select: MultiSelect
  /** Cuántas entradas pasan el filtro (para deshabilitar "Seleccionar todo"). */
  filteredCount: number
  totalCount: number
  onAskClear: () => void
}

/** Barra superior: acciones habituales, o las de la selección múltiple cuando está activa. */
export function SidebarActions({
  collapsed,
  select,
  filteredCount,
  totalCount,
  onAskClear
}: SidebarActionsProps): React.JSX.Element {
  const { t } = useTranslation()
  const { history, layout } = usePorts()

  if (select.active) {
    return (
      <div className="sidebar-actions selection-bar">
        <Button
          aria-label={t('sidebar.cancelSelection')}
          title={t('sidebar.cancelSelection')}
          icon={<X size={16} strokeWidth={1.5} />}
          onClick={select.end}
        />
        {!collapsed && (
          <span className="selection-count" role="status">
            {t('sidebar.selectedCount', { count: select.count })}
          </span>
        )}
        <Button
          aria-label={t('sidebar.selectAll')}
          title={t('sidebar.selectAll')}
          icon={<Check size={16} strokeWidth={1.5} />}
          disabled={select.count === filteredCount}
          onClick={select.selectAll}
        />
        <Button
          variant="primary"
          aria-label={t('sidebar.deleteSelected')}
          title={t('sidebar.deleteSelected')}
          icon={<Trash2 size={16} strokeWidth={1.5} />}
          disabled={select.count === 0}
          onClick={select.askRemove}
        />
      </div>
    )
  }

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
        icon={<FolderOpen size={16} strokeWidth={1.5} />}
        title={`${t('sidebar.openFile')} (Ctrl+O)`}
        aria-label={collapsed ? t('sidebar.openFile') : undefined}
        aria-keyshortcuts="Control+O"
        onClick={() => void history.openFile()}
      >
        {collapsed ? null : t('sidebar.openFile')}
      </Button>
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
