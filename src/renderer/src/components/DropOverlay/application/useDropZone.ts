import { useEffect, useState } from 'react'
import { hasFiles } from '../domain/drag'
import { usePorts } from './ports'

/** Zona de soltado en toda la ventana: `true` mientras se arrastran archivos encima. */
export function useDropZone(): boolean {
  const { drops } = usePorts()
  const [active, setActive] = useState(false)

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
      drops
        .addToQueue(files)
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
  }, [drops])

  return active
}
