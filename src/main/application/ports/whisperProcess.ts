import type { Backend, Segment } from '@shared/types'

export interface WhisperRequest {
  backend: Backend
  cli: string
  args: string[]
  onSegment: (segment: Segment) => void
  /** 0–100 de la transcripción. */
  onProgress: (percent: number) => void
}

export interface WhisperResult {
  segments: Segment[]
  /** `null` si whisper no imprimió la línea de auto-detección (idioma pedido explícito). */
  detectedLanguage: string | null
}

/**
 * Puerto de salida: un whisper-cli en marcha. Si `signal` se aborta mata el proceso y todos
 * sus hijos. Falla con `TranscribeError` (`cancelled`, `backendFailed`) o `BackendLoadError`.
 */
export interface WhisperProcess {
  run(request: WhisperRequest, signal: AbortSignal): Promise<WhisperResult>
}
