import { useEffect, useState } from 'react'
import { usePorts } from './ports'

/** La carpeta de las grabaciones (vacía hasta que llega), cambiarla y abrirla. */
export function useRecordingsDir(): { path: string; pick: () => void; open: () => void } {
  const { storage } = usePorts()
  const [path, setPath] = useState('')

  useEffect(() => {
    storage.getRecordingsDir().then(setPath, console.error)
  }, [storage])

  return {
    path,
    pick: () =>
      storage.pickRecordingsDir().then((picked) => picked && setPath(picked), console.error),
    open: () => storage.openRecordingsDir().catch(console.error)
  }
}
