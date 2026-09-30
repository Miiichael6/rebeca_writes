import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { QueuePanel as QueuePanelScreen } from './ui/QueuePanel'

/**
 * Raíz de composición: conecta el panel de la cola con los adaptadores reales (stores de
 * Zustand y `window.api`). Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function QueuePanel(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <QueuePanelScreen />
    </PortsContext.Provider>
  )
}

export default QueuePanel
