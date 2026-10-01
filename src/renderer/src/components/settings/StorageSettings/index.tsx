import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { StorageSettings as StorageSettingsScreen } from './ui/StorageSettings'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function StorageSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <StorageSettingsScreen />
    </PortsContext.Provider>
  )
}

export default StorageSettings
