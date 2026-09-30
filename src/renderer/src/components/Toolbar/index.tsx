import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { Toolbar as ToolbarScreen } from './ui/Toolbar'

/**
 * Raíz de composición: conecta la barra superior con los adaptadores reales (stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function Toolbar(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <ToolbarScreen />
    </PortsContext.Provider>
  )
}

export default Toolbar
