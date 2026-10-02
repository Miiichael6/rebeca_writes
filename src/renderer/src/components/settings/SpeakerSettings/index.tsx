import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { SpeakerSettings as SpeakerSettingsScreen } from './ui/SpeakerSettings'

/**
 * Raíz de composición: conecta la sección con el store de ajustes y el modelo de voces. Para
 * probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function SpeakerSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <SpeakerSettingsScreen />
    </PortsContext.Provider>
  )
}

export default SpeakerSettings
