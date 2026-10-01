import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { MeetingSettings as MeetingSettingsScreen } from './ui/MeetingSettings'

/**
 * Raíz de composición: conecta la sección con el store de ajustes. Para probarla o
 * reutilizarla, basta con otro `PortsContext.Provider`.
 */
function MeetingSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <MeetingSettingsScreen />
    </PortsContext.Provider>
  )
}

export default MeetingSettings
