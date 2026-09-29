import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import BottomBar from './components/BottomBar'
import DropOverlay from './components/DropOverlay'
import Player from './components/Player'
import QueuePanel from './components/QueuePanel'
import SettingsPage from './components/settings/SettingsPage'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import TranscriptView from './components/TranscriptView'
import { Toaster } from './components/ui'
import { useBackendSync, useCudaOfferToast } from './store/backend'
import { useModelsSync } from './store/models'
import { usePreviewSync } from './store/preview'
import { usePlayerShortcuts } from './store/player'
import { useHistoryStore, useHistorySync } from './store/history'
import { useQueueSync } from './store/queue'
import { useSettingsSync } from './store/settings'
import { toast } from './store/toast'
import { useTranscriptStore } from './store/transcript'
import { useTranscriptionSync } from './store/transcription'
import { useThemeSync, useUiStore } from './store/ui'

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

/** `Ctrl+O` abre el diálogo "Abrir archivo" desde cualquier vista (spec §6). */
function useOpenFileShortcut(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.key.toLowerCase() !== 'o') return
      if (e.repeat || document.querySelector('dialog[open]')) return
      e.preventDefault()
      useUiStore.getState().setView('main')
      useHistoryStore
        .getState()
        .openFile()
        .catch((err) => console.error('No se pudo abrir el archivo', err))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function App(): React.JSX.Element {
  useThemeSync()
  useSettingsSync()
  useBackendFallbackToast()
  useBackendSync()
  useCudaOfferToast()
  useModelsSync()
  usePreviewSync()
  useTranscriptionSync()
  useQueueSync()
  useHistorySync()
  useOpenFileShortcut()
  const view = useUiStore((s) => s.view)

  return (
    <div className="window">
      <TitleBar />

      {view === 'settings' ? <SettingsPage /> : <MainView />}

      <QueuePanel />
      <DropOverlay />
      <Toaster />
    </div>
  )
}

export default App
