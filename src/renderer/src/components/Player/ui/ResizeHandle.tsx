import { useTranslation } from 'react-i18next'
import { VIDEO_HEIGHT_MIN } from '@shared/settings'
import { usePorts } from '../application/ports'
import { clampVideoHeight, maximizedHeight, resizeKeyDelta } from '../domain/stage'

interface ResizeHandleProps {
  height: number
  limit: number
  onDrag: (height: number | null) => void
}

/** Asa inferior del panel de video: arrastrar cambia el alto y se guarda al soltar. */
export function ResizeHandle({ height, limit, onDrag }: ResizeHandleProps): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  return (
    <div
      className="player-resize"
      role="separator"
      aria-orientation="horizontal"
      aria-label={t('player.resize')}
      aria-valuemin={VIDEO_HEIGHT_MIN}
      aria-valuemax={maximizedHeight(limit)}
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
          last = clampVideoHeight(startHeight + ev.clientY - startY, limit)
          onDrag(last)
        }
        const end = (): void => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', end)
          el.removeEventListener('pointercancel', end)
          settings.setVideoHeight(last)
          onDrag(null)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', end)
        el.addEventListener('pointercancel', end)
      }}
      onKeyDown={(e) => {
        const delta = resizeKeyDelta(e.key)
        if (delta === 0) return
        e.preventDefault()
        settings.setVideoHeight(clampVideoHeight(height + delta, limit))
      }}
    />
  )
}
