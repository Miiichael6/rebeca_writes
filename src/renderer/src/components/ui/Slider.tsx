import type { CSSProperties } from 'react'

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  'aria-label': string
  disabled?: boolean
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  ...rest
}: SliderProps): React.JSX.Element {
  // Porcentaje que pinta de acento la parte recorrida de la pista (ver .slider en components.css).
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={rest['aria-label']}
      style={{ '--fill': `${fill}%` } as CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
