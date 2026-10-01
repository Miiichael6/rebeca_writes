import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { DropOverlay as DropOverlayScreen } from './ui/DropOverlay'

/**
 * Raíz de composición: conecta la zona de soltado con los adaptadores reales (IPC y store de
 * la cola). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function DropOverlay(): React.JSX.Element | null {
  return (
    <PortsContext.Provider value={storePorts}>
      <DropOverlayScreen />
    </PortsContext.Provider>
  )
}

export default DropOverlay
