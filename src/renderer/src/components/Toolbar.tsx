import { ChevronDown, Settings, SquarePlay } from 'lucide-react'

const models = ['Tiny', 'Base', 'Small', 'Medium', 'Large v3 turbo', 'Large v3']
const languages = ['Detectar automáticamente', 'Español', 'English', 'Português']

function Select({ options, value }: { options: string[]; value: string }): React.JSX.Element {
  return (
    <div className="select">
      <select defaultValue={value}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={1.5} />
    </div>
  )
}

function Toolbar(): React.JSX.Element {
  return (
    <header className="toolbar">
      <label>Modelo Whisper:</label>
      <Select options={models} value="Small" />
      <span className="gap" />
      <label>Idioma:</label>
      <Select options={languages} value="Español" />
      <span className="spacer" />
      <button className="btn btn-icon" aria-label="Mostrar video" title="Mostrar video">
        <SquarePlay size={16} strokeWidth={1.5} />
      </button>
      <button className="btn btn-icon" aria-label="Configuración" title="Configuración">
        <Settings size={16} strokeWidth={1.5} />
      </button>
      <button className="btn btn-accent">Transcribir</button>
    </header>
  )
}

export default Toolbar
