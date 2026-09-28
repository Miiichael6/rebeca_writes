import { dialog, type BrowserWindow } from 'electron'
import { basename } from 'path'
import log from 'electron-log/main'
import { mediaFileFilters, type MediaFilterKey } from '@shared/formats'
import type { OpenedMedia } from '@shared/types'
import { probe } from './ffmpeg'
import { registerMedia } from './mediaRegistry'
import { previewStatusFor } from './previews'

/**
 * Registra un archivo en la lista blanca de `media://` y lo analiza con ffprobe. Solo se
 * llama con rutas que decide el main (diálogo, y más adelante historial y cola), nunca con
 * una ruta que mande el renderer.
 */
export async function openMedia(filePath: string): Promise<OpenedMedia> {
  const id = registerMedia(filePath)
  const info = await probe(filePath).catch((err) => {
    // Sin probe el `<video>` lo intenta igual; el error real sale al transcribir.
    log.warn(`probe falló para ${filePath}`, err)
    return null
  })
  const preview = await previewStatusFor(filePath, id, info).catch((err) => {
    log.warn(`No se pudo consultar la vista previa de ${filePath}`, err)
    return { state: 'none' } as const
  })
  return { id, filePath, fileName: basename(filePath), info, preview }
}

/** Diálogo para elegir un solo archivo de audio o video; `null` si se cancela. */
export async function pickMediaFile(
  window: BrowserWindow | null,
  filterLabels: Record<MediaFilterKey, string>
): Promise<OpenedMedia | null> {
  const label = (key: MediaFilterKey): string => {
    const value = filterLabels?.[key]
    return typeof value === 'string' && value ? value : key
  }
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: mediaFileFilters(label)
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const filePath = result.canceled ? undefined : result.filePaths[0]
  return filePath ? openMedia(filePath) : null
}
