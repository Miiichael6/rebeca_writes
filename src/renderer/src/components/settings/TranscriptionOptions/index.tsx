import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { TranscriptionOptions as TranscriptionOptionsScreen } from './ui/TranscriptionOptions'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (store de ajustes).
 * Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function TranscriptionOptions(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <TranscriptionOptionsScreen />
    </PortsContext.Provider>
  )
}

export default TranscriptionOptions
