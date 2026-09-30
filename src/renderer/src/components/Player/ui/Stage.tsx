import { Loader2, Music } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { HistoryEntry } from '@shared/types'
import type { Playback } from '@renderer/lib/preview'
import { usePorts } from '../application/ports'
import { useVideoElement } from '../application/usePlaybackSource'
import type { VideoStage } from '../application/useVideoStage'
import { Captions } from './Captions'
import { ResizeHandle } from './ResizeHandle'

interface StageProps {
  entry: HistoryEntry
  playback: Playback | null
  stage: VideoStage
}

/** Panel del `<video>`. Se oculta con CSS y no se desmonta: el audio sigue sonando (spec §4.1). */
export function Stage({ entry, playback, stage }: StageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { playback: player, settings, view, animation } = usePorts()
  const { src, hasVideo } = player.useTransport()
  const showCaptions = settings.useShowCaptions()
  const visible = view.useVideoVisible()
  // El panel se pliega y despliega animado; `mounted` dice cuándo ya se puede ocultar del todo.
  const transition = animation.useStageTransition(visible)
  const videoRef = useVideoElement()

  return (
    <div
      className={`player-stage ${hasVideo ? 'video' : 'audio'} ${transition.state}${stage.dragging ? ' dragging' : ''}`}
      style={{ '--video-height': `${stage.height}px` } as CSSProperties}
      hidden={!transition.mounted}
      onClick={player.toggle}
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
      {hasVideo && (
        <ResizeHandle height={stage.height} limit={stage.limit} onDrag={stage.setDragHeight} />
      )}
    </div>
  )
}
