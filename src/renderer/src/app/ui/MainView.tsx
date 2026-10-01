import { useState, type CSSProperties } from 'react'
import BottomBar from '@renderer/components/BottomBar'
import Player from '@renderer/components/Player'
import Sidebar from '@renderer/components/Sidebar'
import Toolbar from '@renderer/components/Toolbar'
import TranscriptView from '@renderer/components/TranscriptView'
import { usePorts } from '../application/ports'

/** Pantalla principal: historial, barra superior, reproductor, transcripción y barra inferior. */
export function MainView(): React.JSX.Element {
  const { layout } = usePorts()
  const { entryId, sidebarCollapsed, sidebarWidth, transcriptCovered, transcriptFloating } =
    layout.useMainLayout()
  const [resizing, setResizing] = useState(false)
  layout.usePlayerShortcuts()
  return (
    <div
      className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}${resizing ? ' resizing' : ''}`}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <Sidebar onResizing={setResizing} />
      <main className="main">
        <Toolbar />
        {/* `key` reinicia el estado del reproductor al cambiar de archivo. */}
        <Player key={entryId} />
        {/* Con el video tapando la transcripción la barra vive solo en la ventana flotante. */}
        <TranscriptView footer={transcriptFloating ? <BottomBar /> : null} />
        {!transcriptCovered && <BottomBar />}
      </main>
    </div>
  )
}
