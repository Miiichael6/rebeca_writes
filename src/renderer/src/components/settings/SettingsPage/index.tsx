import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { SettingsPage as SettingsPageScreen } from './ui/SettingsPage'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function SettingsPage(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <SettingsPageScreen />
    </PortsContext.Provider>
  )
}

export default SettingsPage
