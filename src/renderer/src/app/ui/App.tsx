import DropOverlay from '@renderer/components/DropOverlay'
import QueuePanel from '@renderer/components/QueuePanel'
import SettingsPage from '@renderer/components/settings/SettingsPage'
import TitleBar from '@renderer/components/TitleBar'
import UpdateButton from '@renderer/components/UpdateButton'
import { Toaster } from '@renderer/components/ui'
import { useViewTransition } from '@renderer/lib/useViewTransition'
import { usePorts } from '../application/ports'
import { useBackendFallbackToast } from '../application/useBackendFallbackToast'
import { useOpenFileShortcut } from '../application/useOpenFileShortcut'
import { MainView } from './MainView'

export function App(): React.JSX.Element {
  const { sync, view: viewPort } = usePorts()
  sync.useSyncAll()
  useBackendFallbackToast()
  useOpenFileShortcut()
  // La vista que se va termina su salida antes de que entre la otra (no conviven).
  const { value: view, state } = useViewTransition(viewPort.useCurrent())

  return (
    <div className="window" data-view-state={state}>
      <TitleBar>
        <UpdateButton />
      </TitleBar>

      {view === 'settings' ? <SettingsPage /> : <MainView />}

      <QueuePanel />
      <DropOverlay />
      <Toaster />
    </div>
  )
}
