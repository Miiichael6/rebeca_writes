import { useState } from 'react'
import { usePorts } from '../application/ports'

/** Texto del segmento que suena, sobre el video. No usa `<track>` para seguir los cambios en vivo. */
export function Captions({ visible }: { visible: boolean }): React.JSX.Element {
  const { playback } = usePorts()
  const text = playback.useCaption()
  // Se recuerda el último texto para que el fundido de salida no vea la capa vacía.
  const [last, setLast] = useState(text ?? '')
  if (text !== null && text !== last) setLast(text)
  return (
    <div className={`player-captions${visible && text !== null ? ' on' : ''}`} aria-hidden>
      <span>{text ?? last}</span>
    </div>
  )
}
