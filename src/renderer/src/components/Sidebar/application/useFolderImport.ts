import { useState } from 'react'
import type { FolderScan } from '@shared/types'
import { usePorts } from './ports'

export interface FolderImport {
  /** Carpeta revisada a la espera de confirmar (o de avisar que no tiene medios). */
  scan: FolderScan | null
  /** Elige una carpeta y la revisa. */
  begin: () => Promise<void>
  confirm: () => Promise<void>
  cancel: () => void
}

/** "Abrir carpeta": elegir, contar los audios y videos, y encolar solo si el usuario confirma. */
export function useFolderImport(): FolderImport {
  const { folder } = usePorts()
  const [scan, setScan] = useState<FolderScan | null>(null)

  const close = (): void => setScan(null)

  return {
    scan,
    begin: async () => setScan(await folder.scan()),
    confirm: async () => {
      close()
      folder.announce(await folder.confirm(true))
    },
    cancel: () => {
      // Sin nada que transcribir no hay lista que descartar en el main.
      if (scan && scan.count > 0) void folder.confirm(false)
      close()
    }
  }
}
