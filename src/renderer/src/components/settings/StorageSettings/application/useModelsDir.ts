import { useEffect, useState } from 'react'
import { usePorts } from './ports'

/** La carpeta de modelos (vacía hasta que llega) y la acción de abrirla. */
export function useModelsDir(): { path: string; open: () => void } {
  const { storage } = usePorts()
  const [path, setPath] = useState('')

  useEffect(() => {
    storage.getModelsDir().then(setPath, console.error)
  }, [storage])

  return { path, open: () => storage.openModelsDir().catch(console.error) }
}
