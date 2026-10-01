import { useEffect } from 'react'
import { usePorts } from './ports'

/** `Ctrl+O` abre el diálogo "Abrir archivo" desde cualquier vista (spec §6). */
export function useOpenFileShortcut(): void {
  const { view, files } = usePorts()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.key.toLowerCase() !== 'o') return
      if (e.repeat || document.querySelector('dialog[open]')) return
      e.preventDefault()
      view.showMain()
      files.open().catch((err) => console.error('No se pudo abrir el archivo', err))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, files])
}
