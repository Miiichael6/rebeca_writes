import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { BackendSetting as BackendSettingScreen } from './ui/BackendSetting'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (stores de Zustand).
 * Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function BackendSetting(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <BackendSettingScreen />
    </PortsContext.Provider>
  )
}

export default BackendSetting
