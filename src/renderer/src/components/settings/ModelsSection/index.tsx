import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { ModelsSection as ModelsSectionScreen } from './ui/ModelsSection'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (store de modelos y
 * `window.api`). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function ModelsSection(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <ModelsSectionScreen />
    </PortsContext.Provider>
  )
}

export default ModelsSection
