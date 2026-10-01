import type { MediaFilterKey } from '@shared/formats'

/** Ventana dueña de un diálogo. Es opaca para los casos de uso: solo la entiende el adaptador. */
export type DialogOwner = object | null

export interface SavePathRequest {
  defaultPath: string
  /** Nombre del filtro, tal como lo muestra el diálogo. */
  filterName: string
  extension: string
}

/** Puerto de salida: diálogos del sistema para elegir o guardar archivos. */
export interface Dialogs {
  /** Archivos de audio o video elegidos; `[]` si se cancela. */
  pickMediaFiles(
    owner: DialogOwner,
    filterLabels: Record<MediaFilterKey, string>,
    multiple: boolean
  ): Promise<string[]>
  /** Un `.bin` GGML local; `null` si se cancela. */
  pickModelFile(owner: DialogOwner): Promise<string | null>
  /** Ruta elegida en "Guardar como"; `null` si se cancela. */
  pickSavePath(owner: DialogOwner, request: SavePathRequest): Promise<string | null>
}
