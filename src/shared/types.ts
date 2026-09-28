/** Tipos de dominio que comparten main, preload y renderer. */

/** Un tramo de la transcripción tal como lo emite whisper. Tiempos en segundos. */
export interface Segment {
  start: number
  end: number
  text: string
}

export type MediaKind = 'video' | 'audio'

export type HistoryStatus = 'pending' | 'transcribing' | 'done' | 'error' | 'cancelled'

/** Entrada de `userData/history/index.json` (spec §5). */
export interface HistoryEntry {
  id: string
  filePath: string
  fileName: string
  durationSec: number
  model: string
  /** Código de idioma elegido, o `auto`. */
  language: string
  detectedLanguage?: string
  backend?: Backend
  /** Fecha de creación en ms (epoch). */
  createdAt: number
  status: HistoryStatus
  /** 0–100, solo mientras `status === 'transcribing'`. */
  progress?: number
}

export type Backend = 'cuda' | 'vulkan' | 'cpu'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

/** Trabajo de la cola (spec §4.2). Guarda el modelo e idioma elegidos al encolarlo. */
export interface QueueJob {
  id: string
  filePath: string
  fileName: string
  model: string
  language: string
  status: JobStatus
  /** 0–100, solo mientras `status === 'processing'`. */
  progress?: number
  error?: string
}

/** Estado del archivo abierto en el panel de transcripción. */
export type TranscriptStatus = 'idle' | 'ready' | 'transcribing' | 'done' | 'error'
