import { lazy, Suspense, useEffect, useState } from 'react'
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
import { useModelsSync } from './store/models'
import { usePreviewSync } from './store/preview'
import { usePlayerShortcuts } from './store/player'
import { useQueueSync } from './store/queue'
import { useSettingsSync } from './store/settings'
import { toast } from './store/toast'
import { useTranscriptStore } from './store/transcript'
import { useTranscriptionSync } from './store/transcription'
import { useThemeSync, useUiStore } from './store/ui'

// Página temporal de componentes; con import dinámico no entra en el build de producción.
const UiDemo = import.meta.env.DEV ? lazy(() => import('./dev/UiDemo')) : null

function MainView(): React.JSX.Element {
  const entryId = useTranscriptStore((s) => s.entry?.id)
  usePlayerShortcuts()
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

/** Aviso no bloqueante cuando el main cae a otro backend (p. ej. "CUDA no disponible, se usó CPU"). */
function useBackendFallbackToast(): void {
  const { t } = useTranslation()
  useEffect(
    () =>
      window.api.backend.onFallback(({ from, to }) =>
        toast(
          t('backend.fallback', {
            from: t(`backend.names.${from}`),
            to: t(`backend.names.${to}`)
          }),
          5000
        )
      ),
    [t]
  )
}

function App(): React.JSX.Element {
  const { t } = useTranslation()
  useThemeSync()
  useSettingsSync()
  useBackendFallbackToast()
  useModelsSync()
  usePreviewSync()
  useTranscriptionSync()
  useQueueSync()
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
