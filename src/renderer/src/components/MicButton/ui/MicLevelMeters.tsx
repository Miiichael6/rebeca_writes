import { Mic, Volume2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { sourceDevices, type RecordingSource } from '@shared/recording'
import { useMicMonitor } from '../application/useMicAction'

function LevelRow({
  icon: Icon,
  label,
  level
}: {
  icon: LucideIcon
  label: string
  level: number
}): React.JSX.Element {
  return (
    <div className="mic-level" title={label}>
      <Icon size={16} strokeWidth={1.5} className="menu-item-icon" aria-hidden="true" />
      <div
        className="mic-level-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
      >
        <div className="mic-level-fill" style={{ transform: `scaleX(${level})` }} />
      </div>
    </div>
  )
}

const ROWS = {
  system: { icon: Volume2, label: 'mic.systemLevel' },
  voice: { icon: Mic, label: 'mic.inputLevel' }
} as const

/**
 * Niveles en vivo arriba del menú del botón de grabar, solo de lo que usa la fuente elegida (el
 * sonido del sistema, el micrófono o los dos), para ver antes de grabar si llega audio. Solo
 * miden mientras están montados (con el menú abierto).
 */
export function MicLevelMeters({
  source,
  micId
}: {
  source: RecordingSource
  micId: string
}): React.JSX.Element {
  const { t } = useTranslation()
  const levels = useMicMonitor(source, micId)
  return (
    <>
      {sourceDevices(source).map((device) => (
        <LevelRow
          key={device}
          icon={ROWS[device].icon}
          label={t(ROWS[device].label)}
          level={levels[device]}
        />
      ))}
    </>
  )
}
