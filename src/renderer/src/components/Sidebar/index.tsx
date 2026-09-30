import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { Sidebar as SidebarScreen } from './ui/Sidebar'

/**
 * Raíz de composición: conecta el menú lateral con los adaptadores reales (stores de Zustand).
 * Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function Sidebar({ onResizing }: { onResizing: (resizing: boolean) => void }): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <SidebarScreen onResizing={onResizing} />
    </PortsContext.Provider>
  )
}

export default Sidebar
