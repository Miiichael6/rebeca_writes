import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { BottomBar as BottomBarScreen } from './ui/BottomBar'

/**
 * Raíz de composición: conecta la barra inferior con los adaptadores reales (stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function BottomBar(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <BottomBarScreen />
    </PortsContext.Provider>
  )
}

export default BottomBar
