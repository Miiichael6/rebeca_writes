import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { UpdateButton as UpdateButtonScreen } from './ui/UpdateButton'

/**
 * Raíz de composición: conecta el botón con los adaptadores reales (store de Zustand).
 * Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function UpdateButton(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <UpdateButtonScreen />
    </PortsContext.Provider>
  )
}

export default UpdateButton
