import { useShallow } from 'zustand/react/shallow'
import { copyTranscript, copyTranscriptForAi } from '@renderer/lib/copyTranscript'
import { exportAs, exportFileName, saveSrtNextToFile } from '@renderer/lib/exportTranscript'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { canEdit, replaceSegments, useTranscriptStore } from '@renderer/store/transcript'
import type { BottomBarPorts } from '../application/ports'

/** Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio que los conoce. */
export const storePorts: BottomBarPorts = {
  settings: {
    useOptions: () =>
      useSettingsStore(
        useShallow((s) => ({ joinLines: s.settings.joinLines, autoScroll: s.settings.autoScroll }))
      ),
    setJoinLines: (joinLines) => updateSettings({ joinLines }),
    setAutoScroll: (autoScroll) => updateSettings({ autoScroll })
  },
  transcript: {
    useIsEmpty: () => useTranscriptStore((s) => s.segments.length === 0),
    copy: () => void copyTranscript(),
    copyForAi: () => void copyTranscriptForAi(),
    exportAs: (format) => void exportAs(format),
    saveSrtBeside: (overwrite) => saveSrtNextToFile(overwrite),
    fileName: exportFileName,
    useCanApplyDictionary: () =>
      useTranscriptStore(
        (s) => s.segments.length > 0 && (s.status === 'done' || s.status === 'error') && canEdit(s)
      ),
    applyDictionary: async () => {
      const entryId = useTranscriptStore.getState().entry?.id
      if (!entryId) return null
      const result = await window.api.history.applyDictionary(entryId)
      if (!result) return null
      if (result.changed > 0) replaceSegments(entryId, result.segments)
      return result.changed
    }
  },
  feedback: {
    toast: (message) => toast(message)
  }
}
