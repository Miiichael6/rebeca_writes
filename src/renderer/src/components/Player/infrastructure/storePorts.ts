import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MOTION } from '@renderer/lib/motion'
import { playbackFor, previewOf } from '@renderer/lib/preview'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useHistoryStore } from '@renderer/store/history'
import {
  bindVideoEvents,
  PLAYBACK_RATES,
  SKIP_SECONDS,
  usePlayerStore
} from '@renderer/store/player'
import { usePreviewStore } from '@renderer/store/preview'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import { captionAt } from '../domain/captions'
import type { PlayerPorts } from '../application/ports'
import { observeStageLimit } from './domStage'

/**
 * Adaptadores de los puertos sobre los stores de Zustand y el DOM. Es el único sitio del
 * reproductor que los conoce.
 */
export const storePorts: PlayerPorts = {
  playback: {
    useTransport: () =>
      usePlayerStore(
        useShallow((s) => ({
          src: s.src,
          hasVideo: s.hasVideo,
          playing: s.playing,
          volume: s.volume,
          muted: s.muted,
          rate: s.rate
        }))
      ),
    useCurrentTime: () => usePlayerStore((s) => s.currentTime),
    useDuration: () => usePlayerStore((s) => s.duration),
    useCaption: () => {
      const segments = useTranscriptStore((s) => s.segments)
      return usePlayerStore((s) => captionAt(segments, s.currentTime))
    },
    rates: PLAYBACK_RATES,
    skipSeconds: SKIP_SECONDS,
    load: (source) => usePlayerStore.getState().load(source),
    bindElement: (element) => {
      const { attach } = usePlayerStore.getState()
      attach(element)
      const unbind = bindVideoEvents(element)
      return () => {
        unbind()
        attach(null)
      }
    },
    toggle: () => usePlayerStore.getState().toggle(),
    seek: (time) => usePlayerStore.getState().seek(time),
    skip: (delta) => usePlayerStore.getState().skip(delta),
    setVolume: (volume) => usePlayerStore.getState().setVolume(volume),
    toggleMute: () => usePlayerStore.getState().toggleMute(),
    setRate: (rate) => usePlayerStore.getState().setRate(rate)
  },
  library: {
    useEntry: () => useTranscriptStore((s) => s.entry),
    useMedia: (entryId) => useHistoryStore((s) => (entryId ? s.media[entryId] : undefined)),
    usePlayback: (media) => {
      const status = usePreviewStore((s) => (media ? previewOf(s.byMedia, media) : null))
      return useMemo(() => (media && status ? playbackFor(media, status) : null), [media, status])
    },
    locateFile: (entryId) => useHistoryStore.getState().locateFile(entryId)
  },
  settings: {
    useVideoHeight: () => useSettingsStore((s) => s.settings.videoHeight),
    useShowCaptions: () => useSettingsStore((s) => s.settings.showCaptions),
    setVideoHeight: (videoHeight) => updateSettings({ videoHeight }),
    setShowCaptions: (showCaptions) => updateSettings({ showCaptions })
  },
  view: {
    useVideoVisible: () => useUiStore((s) => s.videoVisible),
    setTranscriptCovered: (covered) => useUiStore.getState().setTranscriptCovered(covered)
  },
  stage: { observeLimit: observeStageLimit },
  animation: {
    useStageTransition: (visible) => useMountTransition(visible, MOTION)
  }
}
