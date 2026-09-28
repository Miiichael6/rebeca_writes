import { Settings, SquarePlay } from 'lucide-react'
import { useState } from 'react'
import { Button, Select } from './ui'

const models = ['Tiny', 'Base', 'Small', 'Medium', 'Large v3 turbo', 'Large v3'].map((m) => ({
  value: m,
  label: m
}))
const languages = ['Detectar automáticamente', 'Español', 'English', 'Português'].map((l) => ({
  value: l,
  label: l
}))

function Toolbar(): React.JSX.Element {
  const [model, setModel] = useState('Small')
  const [language, setLanguage] = useState('Español')

  return (
    <header className="toolbar">
      <label htmlFor="toolbar-model">Modelo Whisper:</label>
      <Select id="toolbar-model" value={model} onChange={setModel} options={models} />
      <span className="gap" />
      <label htmlFor="toolbar-language">Idioma:</label>
      <Select id="toolbar-language" value={language} onChange={setLanguage} options={languages} />
      <span className="spacer" />
      <Button aria-label="Mostrar video" icon={<SquarePlay size={16} strokeWidth={1.5} />} />
      <Button aria-label="Configuración" icon={<Settings size={16} strokeWidth={1.5} />} />
      <Button variant="primary">Transcribir</Button>
    </header>
  )
}

export default Toolbar
