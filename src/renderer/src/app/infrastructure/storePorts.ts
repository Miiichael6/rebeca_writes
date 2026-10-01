import { useShallow } from 'zustand/react/shallow'
import { useBackendSync, useCudaOfferToast } from '@renderer/store/backend'
import { useHistoryStore, useHistorySync } from '@renderer/store/history'
import { useLiveSync } from '@renderer/store/live'
import { useModelsSync } from '@renderer/store/models'
import { usePlayerShortcuts } from '@renderer/store/player'
import { usePreviewSync } from '@renderer/store/preview'
import { useQueueSync } from '@renderer/store/queue'
import { useSettingsSync } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useTranscriptionSync } from '@renderer/store/transcription'
import { useThemeSync, useUiStore } from '@renderer/store/ui'
import { useUpdatesSync } from '@renderer/store/updates'
import type { AppPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand y `window.api`. Es el único sitio
 * de la raíz de la app que los conoce.
 */
export const storePorts: AppPorts = {
  sync: {
    useSyncAll: () => {
      useThemeSync()
      useSettingsSync()
      useBackendSync()
      useCudaOfferToast()
      useModelsSync()
      usePreviewSync()
      useTranscriptionSync()
      useQueueSync()
      useHistorySync()
      useLiveSync()
      useUpdatesSync()
    }
  },
  view: {
    useCurrent: () => useUiStore((s) => s.view),
    showMain: () => useUiStore.getState().setView('main')
  },
  layout: {
    useMainLayout: () => {
      const entryId = useTranscriptStore((s) => s.entry?.id)
      const ui = useUiStore(
        useShallow((s) => ({
          sidebarCollapsed: s.sidebarCollapsed,
          sidebarWidth: s.sidebarWidth,
          transcriptCovered: s.transcriptCovered,
          transcriptFloating: s.transcriptCovered && s.transcriptWindowOpen
        }))
      )
      return { entryId, ...ui }
    },
    usePlayerShortcuts
  },
  backend: { onFallback: (listener) => window.api.backend.onFallback(listener) },
  files: { open: () => useHistoryStore.getState().openFile() },
  notify: { notify: (message, durationMs) => toast(message, durationMs) }
}
