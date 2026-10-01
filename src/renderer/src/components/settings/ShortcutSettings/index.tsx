import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { ShortcutSettings as ShortcutSettingsScreen } from './ui/ShortcutSettings'

/**
 * Raíz de composición: conecta la sección con los adaptadores reales (IPC y stores de
 * Zustand). Para probarla o reutilizarla, basta con otro `PortsContext.Provider`.
 */
function ShortcutSettings(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <ShortcutSettingsScreen />
    </PortsContext.Provider>
  )
}

export default ShortcutSettings
