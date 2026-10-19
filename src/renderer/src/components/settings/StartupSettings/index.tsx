import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { StartupSettings as StartupSettingsScreen } from './ui/StartupSettings'

/**
 * Raíz de composición: conecta la sección con el store de ajustes. Para probarla o
 * reutilizarla, basta con otro `PortsContext.Provider`.
 */
function StartupSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <StartupSettingsScreen />
    </PortsContext.Provider>
  )
}

export default StartupSettings
