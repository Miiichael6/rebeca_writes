import { FileWarning, Loader2, Music, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { MOTION } from '@renderer/lib/motion'
import { formatClock } from '@renderer/lib/time'
import { findActiveSegment } from '@renderer/lib/segments'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useHistoryStore } from '@renderer/store/history'
import {
  bindVideoEvents,
  PLAYBACK_RATES,
  SKIP_SECONDS,
  usePlayerStore,
  type PlaybackRate
} from '@renderer/store/player'
import { playbackFor, previewOf } from '@renderer/lib/preview'
import { usePreviewStore } from '@renderer/store/preview'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useSettingsStore } from '@renderer/store/settings'
import { useUiStore } from '@renderer/store/ui'
import { Button, Select, Slider } from './ui'

const rateOptions = PLAYBACK_RATES.map((r) => ({ value: String(r), label: `${r}x` }))

/** Texto del segmento que suena, sobre el video. No usa `<track>` para seguir los cambios en vivo. */
function Captions(): React.JSX.Element | null {
  const segments = useTranscriptStore((s) => s.segments)
  const text = usePlayerStore((s) => {
    const i = findActiveSegment(segments, s.currentTime)
    // En los silencios no se muestra nada: el subtítulo solo dura lo que dura su segmento.
    return i !== null && s.currentTime < segments[i].end ? segments[i].text : null
  })
  return text ? (
    <div className="player-captions" aria-hidden>
      <span>{text}</span>
    </div>
  ) : null
}

/**
 * Tiempo actual y barra de posición. Van aparte porque cambian en cada frame mientras suena;
 * así el resto del reproductor no se vuelve a pintar.
 */
function SeekBar({ disabled }: { disabled: boolean }): React.JSX.Element {
  const { t } = useTranslation()
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const { seek, skip } = usePlayerStore.getState()
  return (
    <>
      <span className="player-time">{formatClock(currentTime)}</span>
      <div
        className="player-seek"
        onKeyDown={(e) => {
          // Con la barra enfocada, las flechas saltan 5 s como el atajo global, no 0,1 s.
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          skip(e.key === 'ArrowLeft' ? -SKIP_SECONDS : SKIP_SECONDS)
        }}
      >
        <Slider
          aria-label={t('player.seek')}
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(currentTime, duration)}
          disabled={disabled}
          onChange={seek}
        />
      </div>
      <span className="player-time">{formatClock(duration)}</span>
    </>
  )
}

/** Aviso cuando la entrada no tiene un archivo reproducible asociado (spec §5). */
function Unavailable({ entryId }: { entryId: string }): React.JSX.Element {
  const { t } = useTranslation()
  const locateFile = useHistoryStore((s) => s.locateFile)
  return (
    <div className="player-unavailable" role="status">
      <FileWarning size={18} strokeWidth={1.5} aria-hidden />
      <span>{t('player.unavailable')}</span>
      <Button size="sm" onClick={() => locateFile(entryId)}>
        {t('player.locateFile')}
      </Button>
    </div>
  )
}

/**
 * Reproductor: un único `<video>` controlado por `usePlayerStore` (también para audio, que
 * se oye igual con el panel oculto). El archivo llega por `media://` con el id que dio el
 * main al registrarlo.
 */
function Player(): React.JSX.Element {
  const { t } = useTranslation()
  const entry = useTranscriptStore((s) => s.entry)
  const media = useHistoryStore((s) => (entry ? s.media[entry.id] : undefined))
  const videoVisible = useUiStore((s) => s.videoVisible)
  // El panel se pliega y despliega animado; `mounted` dice cuándo ya se puede ocultar del todo.
  const stage = useMountTransition(videoVisible, MOTION)
  const { videoHeight, showCaptions } = useSettingsStore(
    useShallow((s) => ({
      videoHeight: s.settings.videoHeight,
      showCaptions: s.settings.showCaptions
    }))
  )
  const { src, hasVideo, playing, volume, muted, rate } = usePlayerStore(
    useShallow((s) => ({
      src: s.src,
      hasVideo: s.hasVideo,
      playing: s.playing,
      volume: s.volume,
      muted: s.muted,
      rate: s.rate
    }))
  )
  const { attach, load, toggle, setVolume, toggleMute, setRate } = usePlayerStore.getState()

  const previewStatus = usePreviewStore((s) => (media ? previewOf(s.byMedia, media) : null))
  const playback = useMemo(
    () => (media && previewStatus ? playbackFor(media, previewStatus) : null),
    [media, previewStatus]
  )

  const fallbackDuration = entry?.durationSec ?? 0
  useEffect(() => {
    load(
      media && playback
        ? {
            key: media.id,
            sourceId: playback.sourceId,
            hasVideo: playback.hasVideo,
            duration: media.info?.durationSec || fallbackDuration
          }
        : null
    )
  }, [media, playback, fallbackDuration, load])

  // Ref con limpieza (React 19): registra el elemento en el store mientras está montado.
  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return
      attach(el)
      const unbind = bindVideoEvents(el)
      return () => {
        unbind()
        attach(null)
      }
    },
    [attach]
  )

  const disabled = !src

  return (
    <div className="player">
      {entry && media === null && <Unavailable entryId={entry.id} />}

      {entry && media && (
        <div
          className={`player-stage ${hasVideo ? 'video' : 'audio'} ${stage.state}`}
          style={{ '--video-height': `${videoHeight}px` } as CSSProperties}
          // Oculto con CSS y no desmontado: el `<video>` sigue sonando (spec §4.1).
          hidden={!stage.mounted}
          onClick={toggle}
        >
          <video ref={videoRef} src={src ?? undefined} preload="metadata" playsInline />
          {!hasVideo && (
            <div className="player-audio">
              <Music size={40} strokeWidth={1.25} aria-hidden />
              <span className="player-stage-name">{entry.fileName}</span>
              {playback?.preparing != null && (
                <span className="player-preview" role="status">
                  <Loader2 size={14} strokeWidth={1.75} aria-hidden />
                  {t('player.preparingPreview', { percent: playback.preparing })}
                </span>
              )}
              {playback?.failed && (
                <span className="player-preview" role="status">
                  {t('player.previewFailed')}
                </span>
              )}
            </div>
          )}
          {showCaptions && <Captions />}
        </div>
      )}

      <div className="player-controls">
        <button
          className="player-btn play"
          aria-label={playing ? t('player.pause') : t('player.play')}
          title={playing ? t('player.pause') : t('player.play')}
          disabled={disabled}
          onClick={toggle}
        >
          {playing ? <Pause size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} />}
        </button>
        <SeekBar disabled={disabled} />

        <button
          className="player-btn"
          aria-label={muted ? t('player.unmute') : t('player.mute')}
          title={muted ? t('player.unmute') : t('player.mute')}
          disabled={disabled}
          onClick={toggleMute}
        >
          {muted || volume === 0 ? (
            <VolumeX size={16} strokeWidth={1.5} />
          ) : (
            <Volume2 size={16} strokeWidth={1.5} />
          )}
        </button>
        <div className="player-volume">
          <Slider
            aria-label={t('player.volume')}
            min={0}
            max={100}
            value={muted ? 0 : Math.round(volume * 100)}
            disabled={disabled}
            onChange={(v) => setVolume(v / 100)}
          />
        </div>
        <Select
          aria-label={t('player.speed')}
          value={String(rate)}
          options={rateOptions}
          disabled={disabled}
          onChange={(v) => setRate(Number(v) as PlaybackRate)}
        />
      </div>
    </div>
  )
}

export default Player
