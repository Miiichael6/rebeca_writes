/** Tipos de dominio que comparten main, preload y renderer. */

/** Un tramo de la transcripción tal como lo emite whisper. Tiempos en segundos. */
export interface Segment {
  start: number
  end: number
  text: string
  /** El usuario cambió el texto (tarea 16). */
  edited?: boolean
  /** Texto de whisper antes de la primera edición, para "Restaurar original". */
  originalText?: string
}

export type MediaKind = 'video' | 'audio'

export type HistoryStatus = 'pending' | 'transcribing' | 'done' | 'error' | 'cancelled'

/** Entrada de `userData/history/index.json` (spec §5). */
export interface HistoryEntry {
  id: string
  filePath: string
  fileName: string
  /** Nombre mostrado en el historial si el usuario lo renombró; nunca cambia el archivo. */
  displayName?: string
  durationSec: number
  model: string
  /** Código de idioma elegido, o `auto`. */
  language: string
  detectedLanguage?: string
  /** Se tradujo al inglés (`-tr`): el `.srt` junto al archivo se llama `.en.srt`. */
  translate?: boolean
  backend?: Backend
  /** Fecha de creación en ms (epoch). */
  createdAt: number
  status: HistoryStatus
  /** 0–100, solo mientras `status === 'transcribing'`. */
  progress?: number
}

/** Lo que el renderer manda para crear una entrada; el main pone id, fecha y estado. */
export type HistoryEntryInput = Pick<
  HistoryEntry,
  'filePath' | 'fileName' | 'durationSec' | 'model' | 'language'
>

/**
 * Entrada abierta desde el historial (tarea 18). `media` es `null` si el archivo original
 * ya no está en su ruta: la transcripción se muestra igual y el usuario puede relocalizarlo.
 */
export interface HistoryOpened {
  entry: HistoryEntry
  segments: Segment[]
  media: OpenedMedia | null
}

export type Backend = 'cuda' | 'vulkan' | 'cpu'

/** Backend elegido, el detectado al primer arranque y los que tienen whisper-cli instalado. */
export interface BackendInfo {
  backend: Backend
  detected: Backend
  installed: Backend[]
  /** Hay una GPU NVIDIA (responde `nvidia-smi`), tenga o no CUDA instalado. */
  nvidia: boolean
  /** Hay NVIDIA pero no CUDA: se ofrece descargar el paquete (tarea 23.1). */
  cudaDownloadable: boolean
}

/** Estado del paquete CUDA descargable (`userData/backends/cuda`). */
export interface CudaPackageStatus {
  state: 'missing' | 'downloading' | 'installing' | 'installed'
  /** Bytes del `.part` de una descarga a medias (para "Reanudar"). */
  partBytes: number
  sizeBytes: number
  /** CUDA está en `userData/backends` y se puede quitar; el que trae la app no. */
  removable: boolean
}

/** Progreso de `backend:cuda-progress`: la descarga y después la instalación (sin porcentaje). */
export interface CudaProgress {
  phase: 'downloading' | 'installing'
  received: number
  total: number
  bytesPerSec: number
  etaSec: number | null
}

export type CudaErrorCode =
  'noDiskSpace' | 'downloadFailed' | 'sizeMismatch' | 'cudaInvalid' | 'backendInUse'

export type CudaDownloadResult =
  { status: 'done' } | { status: 'cancelled' } | { status: 'error'; code: CudaErrorCode }

export type CudaActionResult = { ok: true } | { ok: false; code: CudaErrorCode }

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

export type JobStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled'

/**
 * Trabajo de la cola (spec §4.2). Modelo, idioma, traducción y pista se congelan al
 * encolarlo; el resto de opciones de whisper se leen de Configuración al procesarlo.
 */
export interface QueueJob {
  /** También es el id del `TranscribeJob` mientras se procesa. */
  id: string
  filePath: string
  fileName: string
  model: string
  language: string
  translate: boolean
  audioTrack?: number
  status: JobStatus
  /** 0–100, solo mientras `status === 'processing'`. */
  progress?: number
  error?: ErrorCode
  /** `done` sin transcribir: ya tenía un `.srt` al lado y la opción de saltarlos estaba activa. */
  skipped?: boolean
  /** Entrada del historial; se crea al empezar a procesarlo y se reutiliza si se retoma. */
  historyId?: string
  /** Fecha en que se encoló, en ms (epoch). */
  addedAt: number
}

/** Estado completo de la cola que el main envía al renderer. */
export interface QueueState {
  jobs: QueueJob[]
  paused: boolean
  /**
   * Al arrancar quedaron trabajos sin terminar de la sesión anterior: la cola espera
   * (pausada) hasta que el usuario elija Retomar o Descartar.
   */
  resumePending: boolean
}

/** Payload de `queue:drained`: la cola se vació tras procesar al menos un trabajo. */
export interface QueueDrainedEvent {
  done: number
  errors: number
}

/** Resultado de agregar archivos: cuántos entraron a la cola. */
export interface QueueAddResult {
  added: number
  /** Archivos de las carpetas soltadas que no son de audio ni video. */
  ignored: number
}

/**
 * "Abrir archivo" (diálogo con selección múltiple): uno solo se abre en la vista; varios van
 * todos a la cola.
 */
export type OpenFilesResult =
  { kind: 'opened'; media: OpenedMedia } | { kind: 'queued'; result: QueueAddResult }

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
  /**
   * Entrada del historial donde se guardan los segmentos a medida que llegan (y el estado
   * final). Sin ella, el resultado solo viaja al renderer.
   */
  historyId?: string
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

/** Resultado de exportar con el diálogo "Guardar como". `null` si se cancela. */
export interface ExportSaved {
  path: string
}

/**
 * "Guardar .srt junto al archivo". `exists`: ya hay uno con ese nombre y no se pidió
 * reemplazarlo; `missing`: el archivo original ya no está en su carpeta.
 */
export type SaveSrtBesideResult =
  { status: 'saved'; path: string } | { status: 'exists'; path: string } | { status: 'missing' }
