import { useTranslation } from 'react-i18next'
import { useSidebarResize } from '../application/useSidebarResize'

/** Borde derecho del menú: arrastrar cambia el ancho (con límites), doble clic lo restablece. */
export function ResizeEdge({
  onResizing
}: {
  onResizing: (resizing: boolean) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const resize = useSidebarResize(onResizing)
  return (
    <div
      className="sidebar-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label={t('sidebar.resize')}
      aria-valuemin={resize.min}
      aria-valuemax={resize.max}
      aria-valuenow={resize.width}
      tabIndex={0}
      onDoubleClick={resize.reset}
      onPointerDown={resize.onPointerDown}
      onKeyDown={resize.onKeyDown}
    />
  )
}
