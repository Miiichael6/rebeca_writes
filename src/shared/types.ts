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

/** Backend elegido, el detectado al primer arranque y los que tienen whisper-cli instalado. */
export interface BackendInfo {
  backend: Backend
  detected: Backend
  installed: Backend[]
}

/** Aviso de fallback: `from` falló al cargar y la transcripción siguió con `to`. */
export interface BackendFallback {
  from: Backend
  to: Backend
}

/**
 * Errores que el main comunica al renderer. Viajan como código y el renderer los traduce
 * (`errors.<code>` en los locales), así el mensaje sigue el idioma de la interfaz.
 */
export type ErrorCode =
  | 'noAudioStream'
  | 'unreadableMedia'
  | 'conversionFailed'
  | 'modelMissing'
  | 'backendFailed'
  | 'noDiskSpace'
  | 'cancelled'
  | 'unknown'

/** Pista de audio según ffprobe. `index` es su posición entre las de audio (`-map 0:a:<index>`). */
export interface AudioTrack {
  index: number
  /** Código ISO 639-2 de la etiqueta del contenedor (`spa`, `eng`), si la tiene. */
  language?: string
  title?: string
  codec: string
  channels: number
}

/** Resultado de `probe` (spec §2.3 paso 1). */
export interface MediaInfo {
  durationSec: number
  /** `format_name` de ffprobe, p. ej. `mov,mp4,m4a,3gp,3g2,mj2`. */
  container: string
  /** `null` si es solo audio (las carátulas de mp3/m4a no cuentan como video). */
  videoCodec: string | null
  audioTracks: AudioTrack[]
  isChromiumPlayable: boolean
}

/**
 * Medio listo para el reproductor: registrado en la lista blanca de `media://` (se pide
 * con `mediaUrl(id)`) y analizado con ffprobe. `info` es `null` si ffprobe no lo entendió;
 * el `<video>` lo intenta igual.
 */
export interface OpenedMedia {
  id: string
  filePath: string
  fileName: string
  info: MediaInfo | null
  /** Vista previa para códecs que Chromium no reproduce (tarea 11). */
  preview: PreviewStatus
}

/**
 * Qué reproduce el `<video>` para un medio. Los `id` son de la lista blanca de `media://`.
 * - `none`: el original tal cual.
 * - `ready`: la vista previa ya generada.
 * - `pending`: se está generando; mientras tanto suena `audioId` (el original si Chromium
 *   lee su audio, o un audio AAC provisional) o nada si el audio aún no está.
 * - `failed`: no se pudo generar; suena `audioId` si lo hay.
 */
export type PreviewStatus =
  | { state: 'none' }
  | { state: 'ready'; id: string }
  | { state: 'pending'; audioId: string | null; percent: number }
  | { state: 'failed'; audioId: string | null }

/** Cambio en la vista previa del medio `mediaId`; `cleared` = se vació la caché. */
export type MediaPreviewEvent = { mediaId: string; status: PreviewStatus } | { cleared: true }

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
  error?: ErrorCode
}

/** Estado del archivo abierto en el panel de transcripción. */
export type TranscriptStatus = 'idle' | 'ready' | 'transcribing' | 'done' | 'error'

/** Opciones de `whisper-cli` que vienen de Configuración (spec §2.3 paso 3). */
export interface TranscribeOptions {
  /** `--prompt`: vocabulario o contexto inicial. */
  prompt?: string
  /** `-ml`: longitud máxima de línea en caracteres. */
  maxLen?: number
  /** `--suppress-nst`: descarta tokens no-habla (música, risas...). */
  suppressNst?: boolean
  /** Hilos de CPU (`-t`). */
  threads?: number
  /** Filtro `loudnorm` al convertir a WAV. */
  normalize?: boolean
}

/** Trabajo que ejecuta el `TranscriptionEngine` (spec §2.3). */
export interface TranscribeJob {
  id: string
  filePath: string
  /** Id del catálogo o de un modelo personalizado (`ModelCatalogEntry.id` / `custom:<uuid>`). */
  model: string
  /** Código de `WHISPER_LANGUAGES` o `AUTO_LANGUAGE`. */
  language: string
  /** `-tr`: traducir el resultado al inglés. */
  translate?: boolean
  /** Posición entre las pistas de audio (`AudioTrack.index`); por defecto la primera. */
  audioTrack?: number
  options?: TranscribeOptions
}

export type TranscribePhase = 'preparing' | 'transcribing'

/** Payload de `transcribe:progress`. 0–5 % preparando el audio, 5–100 % transcribiendo. */
export interface TranscribeProgressEvent {
  jobId: string
  phase: TranscribePhase
  percent: number
}

/** Payload de `transcribe:segment`: uno o más tramos agrupados para no saturar el IPC. */
export interface TranscribeSegmentEvent {
  jobId: string
  segments: Segment[]
}

export interface TranscribeDoneEvent {
  jobId: string
  segments: Segment[]
  /** Idioma detectado si el trabajo pidió `auto`, si no el mismo que se pidió. */
  language: string
  backend: Backend
}

export interface TranscribeErrorEvent {
  jobId: string
  code: ErrorCode
  detail?: string
}
