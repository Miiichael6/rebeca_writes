import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { TranscriptView as TranscriptViewScreen } from './ui/TranscriptView'

/**
 * Raíz de composición: conecta la vista con los adaptadores reales (stores de Zustand).
 * Para probar la vista o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function TranscriptView({ footer }: { footer?: React.ReactNode }): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <TranscriptViewScreen footer={footer} />
    </PortsContext.Provider>
  )
}

export default TranscriptView
