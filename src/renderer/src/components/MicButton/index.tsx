import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { MicButton as MicButtonScreen } from './ui/MicButton'

/**
 * Raíz de composición: conecta el botón de grabar con los adaptadores reales (stores de
 * Zustand). Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function MicButton(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <MicButtonScreen />
    </PortsContext.Provider>
  )
}

export default MicButton
