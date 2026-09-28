import { lazy, Suspense, useState } from 'react'
import BottomBar from './components/BottomBar'
import Player from './components/Player'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import TranscriptView from './components/TranscriptView'
import { Button, Toaster } from './components/ui'
import { useThemeSync } from './store/ui'

// Página temporal de componentes; con import dinámico no entra en el build de producción.
const UiDemo = import.meta.env.DEV ? lazy(() => import('./dev/UiDemo')) : null

function App(): React.JSX.Element {
  useThemeSync()
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="window">
      <TitleBar>
        {UiDemo && (
          <Button size="sm" variant="ghost" onClick={() => setShowDemo((v) => !v)}>
            {showDemo ? 'Volver' : 'Componentes'}
          </Button>
        )}
      </TitleBar>

      {UiDemo && showDemo ? (
        <Suspense>
          <UiDemo />
        </Suspense>
      ) : (
        <div className="app">
          <Sidebar selectedId="1" />
          <main className="main">
            <Toolbar />
            <Player />
            <TranscriptView segments={[]} />
            <BottomBar />
          </main>
        </div>
      )}

      <Toaster />
    </div>
  )
}

export default App
