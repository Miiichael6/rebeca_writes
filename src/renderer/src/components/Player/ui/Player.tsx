import { useRef } from 'react'
import { usePlaybackSource } from '../application/usePlaybackSource'
import { useVideoStage } from '../application/useVideoStage'
import { Controls } from './Controls'
import { Stage } from './Stage'
import { Unavailable } from './Unavailable'

/**
 * Reproductor: un único `<video>` gobernado por el puerto de reproducción (también para audio,
 * que se oye igual con el panel oculto).
 */
export function Player(): React.JSX.Element {
  const { entry, media, playback } = usePlaybackSource()
  const playerRef = useRef<HTMLDivElement>(null)
  const stage = useVideoStage({ playerRef, hasMedia: Boolean(entry && media) })

  return (
    <div className="player" ref={playerRef}>
      {entry && media === null && <Unavailable entryId={entry.id} recording={entry.live} />}
      {entry && media && <Stage entry={entry} playback={playback} stage={stage} />}
      <Controls stage={stage} />
    </div>
  )
}
