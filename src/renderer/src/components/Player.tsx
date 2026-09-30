import {
  Captions as CaptionsIcon,
  CaptionsOff,
  FileWarning,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { VIDEO_HEIGHT_MAX, VIDEO_HEIGHT_MIN } from '@shared/settings'
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
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useUiStore } from '@renderer/store/ui'
import { Button, Select, Slider } from './ui'

const rateOptions = PLAYBACK_RATES.map((r) => ({ value: String(r), label: `${r}x` }))

/** Texto del segmento que suena, sobre el video. No usa `<track>` para seguir los cambios en vivo. */
function Captions({ visible }: { visible: boolean }): React.JSX.Element {
  const segments = useTranscriptStore((s) => s.segments)
  const text = usePlayerStore((s) => {
    const i = findActiveSegment(segments, s.currentTime)
    // En los silencios no se muestra nada: el subtítulo solo dura lo que dura su segmento.
    return i !== null && s.currentTime < segments[i].end ? segments[i].text : null
  })
  // Se recuerda el último texto para que el fundido de salida no vea la capa vacía.
  const [last, setLast] = useState(text ?? '')
  if (text !== null && text !== last) setLast(text)
  return (
    <div className={`player-captions${visible && text !== null ? ' on' : ''}`} aria-hidden>
      <span>{text ?? last}</span>
    </div>
  )
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

/** Margen superior del panel de video (debe coincidir con `.player-stage` en app.css). */
const STAGE_MARGIN_TOP = 12

/** Si quedan menos px que estos para la transcripción, se considera tapada. */
const COVER_THRESHOLD = 140

/**
 * Alto máximo del panel: todo el espacio de `.main` que no ocupan la barra de herramientas, los
 * controles del reproductor y demás. Con ese alto el video tapa por completo la transcripción.
 */
function stageLimit(player: HTMLElement, main: HTMLElement): number {
  let others = 0
  for (const child of main.children) {
    if (child !== player && !child.classList.contains('transcript') && child instanceof HTMLElement)
      others += child.offsetHeight
  }
  const controls = player.querySelector<HTMLElement>('.player-controls')?.offsetHeight ?? 0
  return Math.min(VIDEO_HEIGHT_MAX, main.clientHeight - others - controls - STAGE_MARGIN_TOP)
}

/** Asa inferior del panel de video: arrastrar cambia el alto y se guarda al soltar. */
function ResizeHandle({
  height,
  limit,
  onDrag
}: {
  height: number
  limit: number
  onDrag: (height: number | null) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const clamp = (h: number): number =>
    Math.round(Math.max(VIDEO_HEIGHT_MIN, Math.min(Math.max(limit, VIDEO_HEIGHT_MIN), h)))
  return (
    <div
      className="player-resize"
      role="separator"
      aria-orientation="horizontal"
      aria-label={t('player.resize')}
      aria-valuemin={VIDEO_HEIGHT_MIN}
      aria-valuemax={Math.max(limit, VIDEO_HEIGHT_MIN)}
      aria-valuenow={height}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const startY = e.clientY
        const startHeight = height
        let last = startHeight
        const move = (ev: PointerEvent): void => {
          last = clamp(startHeight + ev.clientY - startY)
          onDrag(last)
        }
        const end = (): void => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', end)
          el.removeEventListener('pointercancel', end)
          updateSettings({ videoHeight: last })
          onDrag(null)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', end)
        el.addEventListener('pointercancel', end)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        updateSettings({ videoHeight: clamp(height + (e.key === 'ArrowDown' ? 20 : -20)) })
      }}
    />
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
  const { videoHeight: savedHeight, showCaptions } = useSettingsStore(
    useShallow((s) => ({
      videoHeight: s.settings.videoHeight,
      showCaptions: s.settings.showCaptions
    }))
  )
  // Alto provisional mientras se arrastra; al soltar pasa a los ajustes.
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const videoHeight = dragHeight ?? savedHeight

  // Espacio disponible para el panel: se recalcula al cambiar el tamaño de la ventana.
  const playerRef = useRef<HTMLDivElement>(null)
  const [limit, setLimit] = useState(VIDEO_HEIGHT_MAX)
  useLayoutEffect(() => {
    const player = playerRef.current
    const main = player?.closest<HTMLElement>('.main')
    if (!player || !main) return
    const measure = (): void => setLimit(stageLimit(player, main))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(main)
    for (const child of main.children) {
      if (child !== player && !child.classList.contains('transcript')) observer.observe(child)
    }
    return () => observer.disconnect()
  }, [])
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

  // «Pantalla completa» = llevar el asa de redimensionar hasta abajo; otro clic vuelve al alto previo.
  const maximizedHeight = Math.max(limit, VIDEO_HEIGHT_MIN)
  const maximized = videoHeight >= maximizedHeight - 1
  const restoreHeight = useRef(savedHeight)
  const toggleMaximize = (): void => {
    if (maximized) {
      updateSettings({ videoHeight: Math.min(restoreHeight.current, maximizedHeight - 1) })
    } else {
      restoreHeight.current = videoHeight
      updateSettings({ videoHeight: Math.round(maximizedHeight) })
    }
  }

  // Con el video ocupando casi todo el espacio, la transcripción pasa a ser una ventanita.
  const covered =
    Boolean(entry && media) && hasVideo && videoVisible && videoHeight >= limit - COVER_THRESHOLD
  useEffect(() => {
    const { setTranscriptCovered } = useUiStore.getState()
    setTranscriptCovered(covered)
    return () => setTranscriptCovered(false)
  }, [covered])

  return (
    <div className="player" ref={playerRef}>
      {entry && media === null && <Unavailable entryId={entry.id} />}

      {entry && media && (
        <div
          className={`player-stage ${hasVideo ? 'video' : 'audio'} ${stage.state}${dragHeight !== null ? ' dragging' : ''}`}
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
          <Captions visible={showCaptions} />
          {hasVideo && <ResizeHandle height={videoHeight} limit={limit} onDrag={setDragHeight} />}
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
        <button
          className={`player-btn captions-toggle${showCaptions ? ' active' : ''}`}
          aria-label={showCaptions ? t('player.hideCaptions') : t('player.showCaptions')}
          title={showCaptions ? t('player.hideCaptions') : t('player.showCaptions')}
          aria-pressed={showCaptions}
          disabled={disabled}
          onClick={() => updateSettings({ showCaptions: !showCaptions })}
        >
          <CaptionsIcon size={18} strokeWidth={1.5} className="icon-on" />
          <CaptionsOff size={18} strokeWidth={1.5} className="icon-off" />
        </button>
        {hasVideo && videoVisible && (
          <button
            className="player-btn"
            aria-label={maximized ? t('player.restoreSize') : t('player.maximize')}
            title={maximized ? t('player.restoreSize') : t('player.maximize')}
            disabled={disabled}
            onClick={toggleMaximize}
          >
            {maximized ? (
              <Minimize2 size={16} strokeWidth={1.5} />
            ) : (
              <Maximize2 size={16} strokeWidth={1.5} />
            )}
          </button>
        )}
        <Select
          direction="up"
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
