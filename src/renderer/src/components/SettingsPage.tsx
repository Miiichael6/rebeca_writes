import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useUiStore } from '@renderer/store/ui'
import { Button } from './ui'

/** Página de Configuración. Por ahora solo el marco; el contenido es de la tarea 21. */
function SettingsPage(): React.JSX.Element {
  const setView = useUiStore((s) => s.setView)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setView('main')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Button
          variant="ghost"
          aria-label="Volver"
          icon={<ArrowLeft size={18} strokeWidth={1.5} />}
          onClick={() => setView('main')}
          autoFocus
        />
        <h1>Configuración</h1>
      </header>
      <div className="settings-content">
        <p className="settings-placeholder">
          Modelos, interfaz, almacenamiento y acerca de llegan en la tarea 21.
        </p>
      </div>
    </div>
  )
}

export default SettingsPage
