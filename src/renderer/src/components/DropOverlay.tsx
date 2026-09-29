import { FolderInput } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MOTION } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { announceQueued } from '@renderer/store/queue'

/** Solo arrastres desde el Explorador; reordenar la cola también es un arrastre, sin archivos. */
function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes('Files') ?? false
}

/**
 * Zona de soltado en toda la ventana (spec §4.2): archivos y carpetas completas van a la
 * cola. Mientras se arrastra encima se muestra un aviso sobre toda la app.
 */
function DropOverlay(): React.JSX.Element | null {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  const { mounted, state } = useMountTransition(active, MOTION)

  useEffect(() => {
    // dragenter/dragleave saltan en cada elemento hijo: se cuenta la profundidad.
    let depth = 0
    const onEnter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setActive(true)
    }
    const onOver = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      // Sin preventDefault el navegador no permite soltar.
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      window.api.queue
        .addDropped(files)
        .then(announceQueued)
        .catch((err) => console.error('No se pudieron agregar los archivos soltados', err))
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

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

export default DropOverlay
