import { FolderInput } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MOTION } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useDropZone } from '../application/useDropZone'

/**
 * Zona de soltado en toda la ventana (spec §4.2): archivos y carpetas completas van a la
 * cola. Mientras se arrastra encima se muestra un aviso sobre toda la app.
 */
export function DropOverlay(): React.JSX.Element | null {
  const { t } = useTranslation()
  const active = useDropZone()
  const { mounted, state } = useMountTransition(active, MOTION)

  if (!mounted) return null
  return (
    <div className={`drop-overlay ${state}`} aria-hidden="true">
      <div className="drop-overlay-card">
        <FolderInput size={32} strokeWidth={1.5} />
        <strong>{t('drop.title')}</strong>
        <span>{t('drop.hint')}</span>
      </div>
    </div>
  )
}
