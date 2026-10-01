import { useShallow } from 'zustand/react/shallow'
import { useHistoryStore } from '@renderer/store/history'
import { startMic, stopMic, useMicStore } from '@renderer/store/mic'
import { selectDownloaded, useModelsStore } from '@renderer/store/models'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useTranscriptStore } from '@renderer/store/transcript'
import {
  cancelTranscription,
  startBlocker,
  startTranscription
} from '@renderer/store/transcription'
import { useUiStore } from '@renderer/store/ui'
import { needsRestartConfirm } from '../domain/toolbar'
import type { ToolbarPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio de la barra
 * superior que los conoce.
 */
export const storePorts: ToolbarPorts = {
  settings: {
    useChoice: () =>
      useSettingsStore(
        useShallow((s) => ({
          model: s.settings.model,
          language: s.settings.language,
          translate: s.settings.translate
        }))
      ),
    setModel: (model) => updateSettings({ model }),
    setLanguage: (language) => updateSettings({ language }),
    setTranslate: (translate) => updateSettings({ translate })
  },
  models: {
    useDownloaded: () => useModelsStore(useShallow(selectDownloaded)),
    useLoaded: () => useModelsStore((s) => s.models.length > 0)
  },
  transcription: {
    useStatus: () => useTranscriptStore((s) => s.status),
    useBlocker: () => {
      const entryId = useTranscriptStore((s) => s.entry?.id)
      const runningEntryId = useTranscriptStore((s) => s.job?.entryId)
      const hasMedia = useHistoryStore((s) => (entryId ? s.media[entryId] != null : false))
      return startBlocker(entryId, hasMedia, runningEntryId)
    },
    hasEditedSegments: () => needsRestartConfirm(useTranscriptStore.getState().segments),
    start: () => void startTranscription(),
    cancel: () => void cancelTranscription()
  },
  view: {
    useVideoVisible: () => useUiStore((s) => s.videoVisible),
    useTranscriptCovered: () => useUiStore((s) => s.transcriptCovered),
    useTranscriptWindowOpen: () => useUiStore((s) => s.transcriptWindowOpen),
    toggleVideo: () => useUiStore.getState().toggleVideo(),
    toggleTranscriptWindow: () => useUiStore.getState().toggleTranscriptWindow(),
    openSettings: () => useUiStore.getState().setView('settings')
  },
  mic: {
    useState: () => useMicStore((s) => s.state),
    usePending: () => useMicStore((s) => s.pending),
    useLiveSession: () => useTranscriptStore((s) => s.job?.live === true),
    useSource: () => useSettingsStore((s) => s.settings.recordingSource),
    setSource: (recordingSource) => updateSettings({ recordingSource }),
    start: (source, name) => void startMic(source, name),
    stop: () => void stopMic()
  }
}
