import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BottomBar from './components/BottomBar'
import Player from './components/Player'
import QueuePanel from './components/QueuePanel'
import SettingsPage from './components/SettingsPage'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import TranscriptView from './components/TranscriptView'
import { Button, Toaster } from './components/ui'
import { useTranscriptStore } from './store/transcript'
import { useThemeSync, useUiStore } from './store/ui'

// Página temporal de componentes; con import dinámico no entra en el build de producción.
const UiDemo = import.meta.env.DEV ? lazy(() => import('./dev/UiDemo')) : null

function MainView(): React.JSX.Element {
  const entryId = useTranscriptStore((s) => s.entry?.id)
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Toolbar />
        {/* `key` reinicia el estado del reproductor al cambiar de archivo. */}
        <Player key={entryId} />
        <TranscriptView />
        <BottomBar />
      </main>
    </div>
  )
}

function App(): React.JSX.Element {
  const { t } = useTranslation()
  useThemeSync()
  const view = useUiStore((s) => s.view)
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="window">
      <TitleBar>
        {UiDemo && (
          <Button size="sm" variant="ghost" onClick={() => setShowDemo((v) => !v)}>
            {showDemo ? t('common.back') : t('dev.components')}
          </Button>
        )}
      </TitleBar>

      {UiDemo && showDemo ? (
        <Suspense>
          <UiDemo />
        </Suspense>
      ) : view === 'settings' ? (
        <SettingsPage />
      ) : (
        <MainView />
      )}

      <QueuePanel />
      <Toaster />
    </div>
  )
}

export default App
