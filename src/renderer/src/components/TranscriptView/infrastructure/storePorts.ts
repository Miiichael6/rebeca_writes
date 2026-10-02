import { copyTranscript } from '@renderer/lib/copyTranscript'
import { editTranscriptSegment } from '@renderer/lib/editTranscript'
import { findActiveSegment } from '@renderer/lib/segments'
import { speakerName } from '@renderer/lib/speakerNames'
import { registerTranscriptScroller, scrollToSegment } from '@renderer/lib/transcriptScroll'
import { useRecentItems } from '@renderer/lib/useRecentItems'
import { useHistoryStore } from '@renderer/store/history'
import { usePlayerStore } from '@renderer/store/player'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { canEdit, useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import type { TranscriptViewPorts } from '../application/ports'
import { useRowVirtualizer } from './useRowVirtualizer'

/**
 * Adaptadores de los puertos sobre los stores de Zustand y las utilidades de `lib/`. Es el
 * único sitio de la vista que conoce esos módulos.
 */
export const storePorts: TranscriptViewPorts = {
  transcript: {
    useEntry: () => useTranscriptStore((s) => s.entry),
    useSegments: () => useTranscriptStore((s) => s.segments),
    useStatus: () => useTranscriptStore((s) => s.status),
    useError: () => useTranscriptStore((s) => s.error),
    // Devuelve el propio trabajo (o `null`): un objeto nuevo por llamada haría bucle.
    useLiveProgress: () =>
      useTranscriptStore((s) => (s.job?.entryId === s.entry?.id ? s.job : null)),
    useIsTranscribing: () =>
      useTranscriptStore((s) => s.job !== null && s.job.entryId === s.entry?.id),
    useCanEdit: () => useTranscriptStore(canEdit),
    canEditNow: () => canEdit(useTranscriptStore.getState()),
    getSegment: (index) => useTranscriptStore.getState().segments[index],
    editSegment: editTranscriptSegment,
    copyAll: copyTranscript,
    useSpeakerNames: () => useTranscriptStore((s) => s.entry?.speakers),
    speakerName,
    renameSpeaker: (speaker, name) => {
      const entry = useTranscriptStore.getState().entry
      if (entry) void useHistoryStore.getState().renameSpeaker(entry.id, speaker, name)
    }
  },
  playback: {
    usePlaying: () => usePlayerStore((s) => s.playing),
    // El selector devuelve un índice: la lista solo se vuelve a pintar al cambiar de segmento.
    useActiveSegment: (segments) =>
      usePlayerStore((s) => (s.src ? findActiveSegment(segments, s.currentTime) : null)),
    seek: (time) => usePlayerStore.getState().seek(time)
  },
  settings: {
    useJoinLines: () => useSettingsStore((s) => s.settings.joinLines),
    useAutoScroll: () => useSettingsStore((s) => s.settings.autoScroll)
  },
  layout: {
    useCovered: () => useUiStore((s) => s.transcriptCovered),
    useFloating: () => useUiStore((s) => s.transcriptCovered && s.transcriptWindowOpen),
    closeFloatingWindow: () => useUiStore.getState().setTranscriptWindowOpen(false)
  },
  notifier: {
    notify: (message) => toast(message)
  },
  scroll: {
    register: registerTranscriptScroller,
    scrollTo: scrollToSegment
  },
  animation: {
    useArrivals: (count) => useRecentItems(count)
  },
  virtualization: {
    useRows: useRowVirtualizer
  }
}
