import { Play } from 'lucide-react'

function Player(): React.JSX.Element {
  return (
    <div className="player">
      <button className="play-btn" aria-label="Reproducir">
        <Play size={22} strokeWidth={1.5} />
      </button>
      <div className="seek">
        <input type="range" min={0} max={100} defaultValue={0} aria-label="Posición" />
        <div className="times">
          <span>0:00</span>
          <span>0:00</span>
        </div>
      </div>
    </div>
  )
}

export default Player
