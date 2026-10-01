import type { PreviewPlan } from '../../domain/previewPlan'

/** Estado de un archivo que se está preparando. */
export interface PreviewProgress {
  /** Audio provisional listo para sonar, o `null` si todavía no hay. */
  audioPath: string | null
  percent: number
}

export interface PreviewCacheEvents {
  /** Audio provisional listo (no se emite con `audio: 'original'`). */
  audio: [input: string, audioPath: string]
  progress: [input: string, percent: number]
  ready: [input: string, previewPath: string]
  /** No se pudo generar. No se llama `error` para que `EventEmitter` no lance sin oyentes. */
  failed: [input: string, error: Error]
}

/** Puerto de salida: genera y guarda vistas previas de lo que Chromium no reproduce. */
export interface PreviewGenerator {
  on<K extends keyof PreviewCacheEvents>(
    event: K,
    listener: (...args: PreviewCacheEvents[K]) => void
  ): unknown
  /**
   * Vista previa ya generada de `input` (y la marca como usada), o `null`. Si se está
   * generando, `pending` dice cómo va.
   */
  lookup(
    input: string,
    plan: PreviewPlan
  ): Promise<{ path: string } | { pending: PreviewProgress } | null>
  /** Pide la vista previa; el resultado llega por los eventos. */
  request(input: string, plan: PreviewPlan, durationSec: number): Promise<void>
  /** Vacía la caché. Nunca toca los archivos originales. */
  clear(): Promise<void>
  size(): Promise<number>
  /** Mata ffmpeg al salir. */
  dispose(): void
}
