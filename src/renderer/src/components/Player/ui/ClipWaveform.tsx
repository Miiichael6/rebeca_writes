import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatClock } from '@renderer/lib/time'
import type { WaveformState } from '../application/useClipDialog'

interface ClipWaveformProps {
  waveform: WaveformState
  duration: number
  start: number | null
  end: number | null
  onRange: (start: number, end: number) => void
}

/** Movimiento (px) a partir del cual un clic se cuenta como arrastre. */
const DRAG_PX = 3

/** Separación mínima (s) entre las dos etiquetas. */
const MIN_GAP = 0.1

/**
 * Forma de onda del diálogo "Recortar" (tarea 39): barras altas donde hay voz o sonido, casi
 * planas en los silencios. Arrastrar elige el tramo; un clic sin arrastrar mueve el inicio.
 */
export function ClipWaveform({
  waveform,
  duration,
  start,
  end,
  onRange
}: ClipWaveformProps): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; time: number; moved: boolean } | null>(null)
  const track = useRef<HTMLDivElement>(null)

  /** Arrastra una etiqueta bajo la onda: mueve solo su extremo sin cruzar al otro. */
  const dragHandle = (which: 'start' | 'end') => (e: React.PointerEvent<HTMLButtonElement>) => {
    const box = track.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent): void => {
      const time = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width)) * duration
      const s = start ?? 0
      const f = end ?? duration
      if (which === 'start') onRange(Math.min(time, f - MIN_GAP), f)
      else onRange(s, Math.max(time, s + MIN_GAP))
    }
    const up = (): void => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const timeAt = (clientX: number): number => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || box.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * duration
  }

  if (waveform === 'loading' || waveform === null || duration <= 0) {
    return (
      <div className="clip-wave clip-wave-empty" role="status">
        {waveform === 'loading' ? t('clip.waveLoading') : t('clip.waveFailed')}
      </div>
    )
  }

  const bars = waveform.length
  const from = start !== null ? Math.max(0, Math.min(1, start / duration)) : 0
  const to = end !== null ? Math.max(0, Math.min(1, end / duration)) : 1
  const inRange = (i: number): boolean => (i + 0.5) / bars >= from && (i + 0.5) / bars <= to

  return (
    <div className="clip-wave-wrap">
      <div
        ref={ref}
        className="clip-wave"
        role="img"
        aria-label={t('clip.waveLabel')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, time: timeAt(e.clientX), moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          if (!d.moved && Math.abs(e.clientX - d.x) < DRAG_PX) return
          d.moved = true
          const time = timeAt(e.clientX)
          onRange(Math.min(d.time, time), Math.max(d.time, time))
        }}
        onPointerUp={() => {
          const d = drag.current
          drag.current = null
          // Clic sin arrastrar: el inicio va ahí y el fin se queda si sigue detrás.
          if (d && !d.moved) onRange(d.time, end !== null && end > d.time ? end : duration)
        }}
      >
        <svg viewBox={`0 0 ${bars} 100`} preserveAspectRatio="none" aria-hidden="true">
          <rect
            className="clip-wave-range"
            x={from * bars}
            y={0}
            width={Math.max(0, (to - from) * bars)}
            height={100}
          />
          {waveform.map((peak, i) => {
            const h = Math.max(2, peak * 92)
            return (
              <rect
                key={i}
                className={inRange(i) ? 'clip-wave-bar in' : 'clip-wave-bar'}
                x={i + 0.15}
                y={50 - h / 2}
                width={0.7}
                height={h}
              />
            )
          })}
        </svg>
      </div>
      <div ref={track} className="clip-wave-handles">
        <button
          type="button"
          className="clip-wave-handle"
          style={{ left: `${from * 100}%` }}
          aria-label={t('clip.start')}
          title={t('clip.start')}
          onPointerDown={dragHandle('start')}
        />
        <button
          type="button"
          className="clip-wave-handle"
          style={{ left: `${to * 100}%` }}
          aria-label={t('clip.end')}
          title={t('clip.end')}
          onPointerDown={dragHandle('end')}
        />
      </div>
      <div className="clip-wave-axis" aria-hidden="true">
        <span>0:00</span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  )
}
