import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { AboutSection as AboutSectionScreen } from './ui/AboutSection'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function AboutSection(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <AboutSectionScreen />
    </PortsContext.Provider>
  )
}

export default AboutSection
