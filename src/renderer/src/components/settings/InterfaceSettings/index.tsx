import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { InterfaceSettings as InterfaceSettingsScreen } from './ui/InterfaceSettings'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function InterfaceSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <InterfaceSettingsScreen />
    </PortsContext.Provider>
  )
}

export default InterfaceSettings
