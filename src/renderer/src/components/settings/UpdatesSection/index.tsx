import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { UpdatesSection as UpdatesSectionScreen } from './ui/UpdatesSection'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function UpdatesSection(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <UpdatesSectionScreen />
    </PortsContext.Provider>
  )
}

export default UpdatesSection
