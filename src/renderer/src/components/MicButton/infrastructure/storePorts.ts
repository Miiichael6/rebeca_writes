import {
  listMicrophones,
  onMicLevel,
  onMonitorLevel,
  startMic,
  startMicMonitor,
  stopMic,
  stopMicMonitor,
  useMicStore
} from '@renderer/store/mic'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useTranscriptStore } from '@renderer/store/transcript'
import type { MicButtonPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre los stores de Zustand. Es el único sitio del botón de
 * grabar que los conoce.
 */
export const storePorts: MicButtonPorts = {
  mic: {
    useState: () => useMicStore((s) => s.state),
    usePending: () => useMicStore((s) => s.pending),
    useLiveSession: () => useTranscriptStore((s) => s.job?.live === true),
    useSource: () => useSettingsStore((s) => s.settings.recordingSource),
    setSource: (recordingSource) => updateSettings({ recordingSource }),
    useMicId: () => useSettingsStore((s) => s.settings.recordingMicId),
    setMicId: (recordingMicId) => updateSettings({ recordingMicId }),
    listMicrophones,
    onLevel: onMicLevel,
    onMonitorLevel,
    startMonitor: startMicMonitor,
    stopMonitor: stopMicMonitor,
    start: (source, name) => void startMic(source, name),
    stop: () => void stopMic()
  }
}
