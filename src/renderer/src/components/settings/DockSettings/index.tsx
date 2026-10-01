import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { DockSettings as DockSettingsScreen } from './ui/DockSettings'

/**
 * Raíz de composición: conecta la sección con el store de ajustes. Para probarla o
 * reutilizarla, basta con otro `PortsContext.Provider`.
 */
function DockSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <DockSettingsScreen />
    </PortsContext.Provider>
  )
}

export default DockSettings
