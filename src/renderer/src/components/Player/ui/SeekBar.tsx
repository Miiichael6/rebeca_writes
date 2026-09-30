import { useTranslation } from 'react-i18next'
import { formatClock } from '@renderer/lib/time'
import { usePorts } from '../application/ports'
import { seekKeyDirection } from '../domain/captions'
import { Slider } from '../../ui'

/**
 * Tiempo actual y barra de posición. Van aparte porque cambian en cada frame mientras suena;
 * así el resto del reproductor no se vuelve a pintar.
 */
export function SeekBar({ disabled }: { disabled: boolean }): React.JSX.Element {
  const { t } = useTranslation()
  const { playback } = usePorts()
  const currentTime = playback.useCurrentTime()
  const duration = playback.useDuration()
  return (
    <>
      <span className="player-time">{formatClock(currentTime)}</span>
      <div
        className="player-seek"
        onKeyDown={(e) => {
          // Con la barra enfocada, las flechas saltan 5 s como el atajo global, no 0,1 s.
          const direction = seekKeyDirection(e.key)
          if (direction === 0) return
          e.preventDefault()
          playback.skip(direction * playback.skipSeconds)
        }}
      >
        <Slider
          aria-label={t('player.seek')}
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(currentTime, duration)}
          disabled={disabled}
          onChange={playback.seek}
        />
      </div>
      <span className="player-time">{formatClock(duration)}</span>
    </>
  )
}
