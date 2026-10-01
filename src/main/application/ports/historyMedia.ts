import type { OpenedMedia } from '@shared/types'

/** Puerto de salida: lo que el historial necesita de los medios y del sistema. */
export interface HistoryMedia {
  /** ¿La ruta es un medio que se puede servir por `media://`? */
  isSafePath(path: string): boolean
  exists(path: string): Promise<boolean>
  /** Registra el archivo en `media://` y devuelve lo necesario para reproducirlo. */
  open(path: string): Promise<OpenedMedia>
  /** Saca el archivo de la lista blanca de `media://`. */
  unregister(path: string): void
  clearPreviewCache(): Promise<void>
  showInFolder(path: string): void
}
