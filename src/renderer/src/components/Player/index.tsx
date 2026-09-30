import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { Player as PlayerScreen } from './ui/Player'

/**
 * Raíz de composición: conecta el reproductor con los adaptadores reales (stores de Zustand y
 * DOM). Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function Player(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <PlayerScreen />
    </PortsContext.Provider>
  )
}

export default Player
