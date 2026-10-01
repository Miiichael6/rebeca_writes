import { useShallow } from 'zustand/react/shallow'
import { copyTranscript } from '@renderer/lib/copyTranscript'
import { exportAs, exportFileName, saveSrtNextToFile } from '@renderer/lib/exportTranscript'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useTranscriptStore } from '@renderer/store/transcript'
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
    exportAs: (format) => void exportAs(format),
    saveSrtBeside: (overwrite) => saveSrtNextToFile(overwrite),
    fileName: exportFileName
  }
}
