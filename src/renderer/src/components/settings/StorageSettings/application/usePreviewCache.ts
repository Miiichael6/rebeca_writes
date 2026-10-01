import { useCallback, useEffect, useState } from 'react'
import { usePorts } from './ports'

export interface PreviewCache {
  /** `null` hasta que llega el tamaño. */
  size: number | null
  clearing: boolean
  clear: () => Promise<void>
}

/** Tamaño de la caché de vistas previas y su vaciado. `onCleared` avisa al terminar bien. */
export function usePreviewCache(onCleared: () => void): PreviewCache {
  const { storage } = usePorts()
  const [size, setSize] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  const refresh = useCallback(async () => setSize(await storage.getPreviewCacheSize()), [storage])

  useEffect(() => {
    storage.getPreviewCacheSize().then(setSize, console.error)
  }, [storage])

  const clear = async (): Promise<void> => {
    setClearing(true)
    try {
      await storage.clearPreviewCache()
      onCleared()
    } catch (err) {
      console.error('No se pudo vaciar la caché', err)
    } finally {
      await refresh().catch(console.error)
      setClearing(false)
    }
  }

  return { size, clearing, clear }
}
