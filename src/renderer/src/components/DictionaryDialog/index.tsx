import { PortsContext } from './application/ports'
import { storePorts } from './infrastructure/storePorts'
import { DictionaryDialog as DictionaryDialogScreen } from './ui/DictionaryDialog'

/**
 * Raíz de composición: conecta el diálogo del diccionario con el API del preload y los stores.
 * Para probarlo o reutilizarlo, basta con otro `PortsContext.Provider`.
 */
function DictionaryDialog(): React.JSX.Element {
  return (
    <PortsContext.Provider value={storePorts}>
      <DictionaryDialogScreen />
    </PortsContext.Provider>
  )
}

export default DictionaryDialog
