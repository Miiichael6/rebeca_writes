import type { ModelStatus } from '@shared/models'

export type MemoryLevel = 'low' | 'medium' | 'high'

/** Bajo / Medio / Alto, como en la referencia: Tiny y Base ~1 GB, Small ~2 GB, el resto más. */
export function memoryLevel(gb: number): MemoryLevel {
  return gb <= 1 ? 'low' : gb <= 2 ? 'medium' : 'high'
}

/** Descarga a medias: falta el modelo pero ya hay bytes en disco. */
export function isPartial(model: ModelStatus): boolean {
  return model.state === 'missing' && model.sizeOnDisk > 0
}

/** Qué tamaño mostrar en la fila. El formato y el texto los pone quien pinta. */
export type SizeInfo =
  | { kind: 'size'; bytes: number }
  | { kind: 'fileMissing' }
  | { kind: 'partial'; received: number; total: number }

export function sizeInfo(model: ModelStatus): SizeInfo {
  if (model.custom) {
    return model.state === 'downloaded'
      ? { kind: 'size', bytes: model.sizeOnDisk }
      : { kind: 'fileMissing' }
  }
  if (model.state === 'downloaded') return { kind: 'size', bytes: model.sizeOnDisk }
  if (isPartial(model)) {
    return { kind: 'partial', received: model.sizeOnDisk, total: model.sizeBytes ?? 0 }
  }
  return { kind: 'size', bytes: model.sizeBytes ?? 0 }
}

export interface RowActions {
  cancel: boolean
  /** Botón de descargar; si `resume`, es continuar una descarga a medias. */
  download: boolean
  resume: boolean
  /** Botón de eliminar (o quitar, si es propio). */
  remove: boolean
}

export function rowActions(model: ModelStatus): RowActions {
  const partial = isPartial(model)
  return {
    cancel: model.state === 'downloading',
    download: model.state === 'missing' && !model.custom,
    resume: partial,
    remove: model.state === 'downloaded' || Boolean(model.custom) || partial
  }
}

/** Nombre propuesto para un modelo propio: el del archivo sin carpeta ni `.bin`. */
export function defaultCustomName(path: string): string {
  return path.replace(/^.*[\\/]/, '').replace(/\.bin$/i, '')
}
