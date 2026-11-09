import { Check, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MultiSelect } from '../application/useMultiSelect'
import { Button } from '../../ui'

interface SelectionBarProps {
  collapsed: boolean
  select: MultiSelect
  /** Cuántas entradas pasan el filtro (para deshabilitar "Seleccionar todo"). */
  filteredCount: number
}

/** Barra al pie de la selección múltiple: cuántas hay, seleccionar todo, cancelar y eliminar. */
export function SelectionBar({
  collapsed,
  select,
  filteredCount
}: SelectionBarProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="selection-bar">
      {!collapsed && (
        <span className="selection-count" role="status">
          {t('sidebar.selectedCount', { count: select.count })}
        </span>
      )}
      <Button
        size="sm"
        aria-label={t('sidebar.selectAll')}
        title={t('sidebar.selectAll')}
        icon={<Check size={16} strokeWidth={1.5} />}
        disabled={select.count === filteredCount}
        onClick={select.selectAll}
      />
      <Button
        size="sm"
        aria-label={t('sidebar.cancelSelection')}
        title={t('sidebar.cancelSelection')}
        icon={<X size={16} strokeWidth={1.5} />}
        onClick={select.end}
      />
      <Button
        size="sm"
        className="selection-delete"
        aria-label={t('sidebar.deleteSelected')}
        title={t('sidebar.deleteSelected')}
        icon={<Trash2 size={16} strokeWidth={1.5} />}
        disabled={select.count === 0}
        onClick={select.askRemove}
      />
    </div>
  )
}
