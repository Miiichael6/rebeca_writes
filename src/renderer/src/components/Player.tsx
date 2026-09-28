import { Music, Pause, Play, SquarePlay, Volume2, VolumeX } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaKindOf } from '@shared/media'
import { formatClock } from '@renderer/lib/time'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import { Select, Slider } from './ui'

const SPEEDS = ['0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'] as const
type Speed = (typeof SPEEDS)[number]
const speedOptions = SPEEDS.map((s) => ({ value: s, label: `${s}x` }))

/**
 * Reproductor de ejemplo: solo la parte visual. El `<video>` real, el protocolo `media://`
 * y la sincronización con la transcripción llegan en las tareas 09 y 10.
 */
function Player(): React.JSX.Element {
  const { t } = useTranslation()
  const entry = useTranscriptStore((s) => s.entry)
  const videoVisible = useUiStore((s) => s.videoVisible)
  const videoHeight = useUiStore((s) => s.videoHeight)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState<Speed>('1')

  const duration = entry?.durationSec ?? 0
  const disabled = !entry
  const kind = entry ? mediaKindOf(entry.fileName) : null

  return (
    <div className="player">
      {entry && videoVisible && (
        <div
          className={`player-stage ${kind}`}
          style={{ '--video-height': `${videoHeight}px` } as CSSProperties}
        >
          {kind === 'audio' ? (
            <>
              <Music size={40} strokeWidth={1.25} aria-hidden />
              <span className="player-stage-name">{entry.fileName}</span>
            </>
          ) : (
            <SquarePlay size={40} strokeWidth={1.25} aria-hidden />
          )}
        </div>
      )}

      <div className="player-controls">
        <button
          className="player-btn play"
          aria-label={playing ? t('player.pause') : t('player.play')}
          title={playing ? t('player.pause') : t('player.play')}
          disabled={disabled}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} />}
        </button>
        <span className="player-time">{formatClock(time)}</span>
        <div className="player-seek">
          <Slider
            aria-label={t('player.seek')}
            min={0}
            max={Math.max(duration, 1)}
            value={time}
            disabled={disabled}
            onChange={setTime}
          />
        </div>
        <span className="player-time">{formatClock(duration)}</span>

        <button
          className="player-btn"
          aria-label={muted ? t('player.unmute') : t('player.mute')}
          title={muted ? t('player.unmute') : t('player.mute')}
          disabled={disabled}
          onClick={() => setMuted((m) => !m)}
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
            value={muted ? 0 : volume}
            disabled={disabled}
            onChange={(v) => {
              setVolume(v)
              setMuted(false)
            }}
          />
        </div>
        <Select
          aria-label={t('player.speed')}
          value={speed}
          options={speedOptions}
          disabled={disabled}
          onChange={setSpeed}
        />
      </div>
    </div>
  )
}

export default Player
