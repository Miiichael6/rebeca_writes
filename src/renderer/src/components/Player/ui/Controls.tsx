import {
  Captions as CaptionsIcon,
  CaptionsOff,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlaybackRate } from '@renderer/store/player'
import { usePorts } from '../application/ports'
import type { VideoStage } from '../application/useVideoStage'
import { Select, Slider } from '../../ui'
import { SeekBar } from './SeekBar'

/** Barra de controles: reproducir, posición, volumen, subtítulos, maximizar y velocidad. */
export function Controls({ stage }: { stage: VideoStage }): React.JSX.Element {
  const { t } = useTranslation()
  const { playback, settings, view } = usePorts()
  const { src, hasVideo, playing, volume, muted, rate } = playback.useTransport()
  const showCaptions = settings.useShowCaptions()
  const videoVisible = view.useVideoVisible()
  const rateOptions = useMemo(
    () => playback.rates.map((r) => ({ value: String(r), label: `${r}x` })),
    [playback.rates]
  )
  const disabled = !src

  return (
    <div className="player-controls">
      <button
        className="player-btn play"
        aria-label={playing ? t('player.pause') : t('player.play')}
        title={playing ? t('player.pause') : t('player.play')}
        disabled={disabled}
        onClick={playback.toggle}
      >
        {playing ? <Pause size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} />}
      </button>
      <SeekBar disabled={disabled} />

      <button
        className="player-btn"
        aria-label={muted ? t('player.unmute') : t('player.mute')}
        title={muted ? t('player.unmute') : t('player.mute')}
        disabled={disabled}
        onClick={playback.toggleMute}
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
          onChange={(v) => playback.setVolume(v / 100)}
        />
      </div>
      <button
        className={`player-btn captions-toggle${showCaptions ? ' active' : ''}`}
        aria-label={showCaptions ? t('player.hideCaptions') : t('player.showCaptions')}
        title={showCaptions ? t('player.hideCaptions') : t('player.showCaptions')}
        aria-pressed={showCaptions}
        disabled={disabled}
        onClick={() => settings.setShowCaptions(!showCaptions)}
      >
        <CaptionsIcon size={18} strokeWidth={1.5} className="icon-on" />
        <CaptionsOff size={18} strokeWidth={1.5} className="icon-off" />
      </button>
      {hasVideo && videoVisible && (
        <button
          className="player-btn"
          aria-label={stage.maximized ? t('player.restoreSize') : t('player.maximize')}
          title={stage.maximized ? t('player.restoreSize') : t('player.maximize')}
          disabled={disabled}
          onClick={stage.toggleMaximize}
        >
          {stage.maximized ? (
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
        onChange={(v) => playback.setRate(Number(v) as PlaybackRate)}
      />
    </div>
  )
}
