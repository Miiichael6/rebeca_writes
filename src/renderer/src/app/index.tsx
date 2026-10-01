import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { App as AppScreen } from './ui/App'

/**
 * Raíz de composición de la app: conecta la ventana con los adaptadores reales (stores de
 * Zustand e IPC). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function App(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <AppScreen />
    </PortsContext.Provider>
  )
}

export default App
