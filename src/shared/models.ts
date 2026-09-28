/** Catálogo de modelos oficiales de whisper.cpp (spec §2.2). */

export const MODEL_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/'

export type ModelSpeed = 'fast' | 'moderate' | 'moderateGpu' | 'slow'
export type ModelAccuracy = 'basic' | 'acceptable' | 'good' | 'veryGood' | 'superior'

export interface ModelCatalogEntry {
  /** Sufijo de `ggml-<id>.bin`; es el valor que se guarda en settings y en el historial. */
  id: string
  label: string
  file: string
  url: string
  speed: ModelSpeed
  accuracy: ModelAccuracy
  /** Memoria aproximada al transcribir, en GB. */
  memoryGb: number
  /** Tamaño exacto del `.bin` (cabecera `X-Linked-Size` de Hugging Face). */
  sizeBytes: number
}

function model(
  id: string,
  label: string,
  speed: ModelSpeed,
  accuracy: ModelAccuracy,
  memoryGb: number,
  sizeBytes: number
): ModelCatalogEntry {
  const file = `ggml-${id}.bin`
  return { id, label, file, url: MODEL_BASE_URL + file, speed, accuracy, memoryGb, sizeBytes }
}

export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  model('tiny', 'Tiny', 'fast', 'basic', 1, 77_691_713),
  model('base', 'Base', 'fast', 'acceptable', 1, 147_951_465),
  model('small', 'Small', 'moderate', 'good', 2, 487_601_967),
  model('medium', 'Medium', 'slow', 'veryGood', 5, 1_533_763_059),
  model('large-v3-turbo', 'Large v3 turbo', 'moderateGpu', 'superior', 6, 1_624_555_275),
  model('large-v3', 'Large v3', 'slow', 'superior', 10, 3_095_033_483)
]

export function catalogModel(id: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === id)
}

/** Prefijo de los ids de modelos personalizados, para que no choquen con los del catálogo. */
export const CUSTOM_MODEL_PREFIX = 'custom:'

export type ModelState = 'downloaded' | 'downloading' | 'missing'

/** Fila de `models:list`: un modelo del catálogo o uno personalizado. */
export interface ModelStatus {
  id: string
  label: string
  custom: boolean
  state: ModelState
  /** Bytes en disco: el `.bin` si está descargado, el `.part` si no. */
  sizeOnDisk: number
  /** Tamaño esperado (solo catálogo). */
  sizeBytes?: number
  /** Ruta del archivo (solo si está descargado o es personalizado). */
  path?: string
  /** Metadatos del catálogo para la lista de Configuración. */
  speed?: ModelSpeed
  accuracy?: ModelAccuracy
  memoryGb?: number
}

/** Evento `models:progress`, como mucho cada 250 ms por descarga. */
export interface ModelProgress {
  id: string
  received: number
  total: number
  /** Media móvil de la velocidad, en bytes por segundo. */
  bytesPerSec: number
  /** Segundos restantes estimados, o `null` si todavía no hay velocidad. */
  etaSec: number | null
}

export type ModelErrorCode =
  | 'modelNotFound'
  | 'noDiskSpace'
  | 'downloadFailed'
  | 'sizeMismatch'
  | 'modelInUse'
  | 'invalidModel'

/** Resultado de `models:download`: termina, se cancela o falla con un código traducible. */
export type ModelDownloadResult =
  { status: 'done' } | { status: 'cancelled' } | { status: 'error'; code: ModelErrorCode }

/** Resultado de operaciones que pueden fallar sin excepción (borrar, añadir personalizado). */
export type ModelActionResult = { ok: true } | { ok: false; code: ModelErrorCode }
