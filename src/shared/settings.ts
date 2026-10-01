import { DEFAULT_DOCK_POSITION, type DockPosition } from './dock'
import type { UiLanguageSetting } from './i18n'
import { DEFAULT_RECORDING_SOURCE, type RecordingSource } from './recording'
import { DEFAULT_RECORD_SHORTCUT } from './shortcut'
import type { ThemeMode } from './theme'
import type { Backend, TranscribeOptions } from './types'
import { AUTO_LANGUAGE } from './whisper'

/** Versión del formato de `settings.json`. Se sube al añadir una migración en `services/settings`. */
export const SETTINGS_VERSION = 1

/** Límites de la altura del panel de video (spec §4.1). */
export const VIDEO_HEIGHT_MIN = 180
/** Tope del valor guardado: arrastrar el borde puede tapar toda la transcripción. */
export const VIDEO_HEIGHT_MAX = 4000
/** Tope del control deslizante de Configuración. */
export const VIDEO_HEIGHT_SLIDER_MAX = 600

/** Tamaño y posición de la ventana principal. `x`/`y` faltan hasta la primera vez que se mueve. */
export interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
  maximized: boolean
}

/** Opciones de la cola (spec §4.2, tarea 17). */
export interface QueueSettings {
  /** Saltar archivos que ya tienen un `.srt` al lado. */
  skipExistingSrt: boolean
  /** Al terminar, guardar el `.srt` junto al archivo. */
  autoSaveSrt: boolean
}

/** Contenido de `userData/settings.json` (spec §4.3 y §5). */
export interface Settings {
  version: number

  /** Backend elegido; `null` hasta la autodetección del primer arranque. */
  backend: Backend | null
  /** Backend autodetectado; `null` = la detección aún no corrió. */
  detectedBackend: Backend | null
  /** Backends instalados cuando corrió la detección; si cambian se vuelve a detectar. */
  installedBackends: Backend[]
  /** Ya se mostró el aviso "Tu GPU NVIDIA puede transcribir mucho más rápido". */
  cudaOffered: boolean

  // Barra superior e inferior.
  model: string
  /** Código de `WHISPER_LANGUAGES` o `AUTO_LANGUAGE`. */
  language: string
  translate: boolean
  joinLines: boolean
  autoScroll: boolean

  // Opciones de transcripción (whisper-cli).
  promptEnabled: boolean
  prompt: string
  /** `-ml`; 0 = sin límite. */
  maxLen: number
  suppressNst: boolean
  normalize: boolean
  /** `-t`; por defecto la mitad de los núcleos. */
  threads: number

  // Interfaz.
  showCaptions: boolean
  videoHeight: number
  theme: ThemeMode
  uiLanguage: UiLanguageSetting

  /** Buscar actualizaciones al iniciar (tarea 25). */
  autoCheckUpdates: boolean

  /** Límite de la caché de vistas previas en GB. */
  previewCacheMaxGB: number

  // Grabar con el micrófono (tarea 29).
  /** Fuente elegida en el menú del botón de grabar. */
  recordingSource: RecordingSource
  /** Micrófono para Mi voz y Ambos; vacío = el predeterminado de Windows. */
  recordingMicId: string
  /** Carpeta de los MP3 grabados; vacío = `Documentos\RebeccaWrites\Grabaciones`. */
  recordingsDir: string
  /** Atajo global para grabar (tarea 31), como `Ctrl+Super`; `null` = desactivado. */
  recordShortcut: string | null
  /** El dock pregunta si grabar al empezar una llamada (tarea 32). */
  suggestMeetingRecording: boolean
  /** Dónde vive el dock (tarea 33). */
  dockPosition: DockPosition

  queue: QueueSettings
  window: WindowBounds
}

/** Cambio parcial: los objetos anidados también pueden venir a medias. */
export type SettingsPatch = Partial<Omit<Settings, 'version' | 'queue' | 'window'>> & {
  queue?: Partial<QueueSettings>
  window?: Partial<WindowBounds>
}

/** Opciones de whisper-cli que salen de Configuración, al lanzar un trabajo. */
export function transcribeOptionsFrom(s: Settings): TranscribeOptions {
  return {
    prompt: s.promptEnabled && s.prompt.trim() ? s.prompt.trim() : undefined,
    maxLen: s.maxLen,
    suppressNst: s.suppressNst,
    threads: s.threads,
    normalize: s.normalize
  }
}

/** Mitad de los núcleos, mínimo 1 (spec §4.3). */
export function defaultThreads(cpuCount: number): number {
  return Math.max(1, Math.floor(cpuCount / 2))
}

/**
 * Valores por defecto. Los hilos dependen de la máquina, por eso es una función: el main
 * la llama con `os.availableParallelism()`.
 */
export function createDefaultSettings(cpuCount: number): Settings {
  return {
    version: SETTINGS_VERSION,
    backend: null,
    detectedBackend: null,
    installedBackends: [],
    cudaOffered: false,
    model: 'small',
    language: AUTO_LANGUAGE,
    translate: false,
    joinLines: true,
    autoScroll: true,
    promptEnabled: false,
    prompt: '',
    maxLen: 0,
    suppressNst: false,
    normalize: true,
    threads: defaultThreads(cpuCount),
    showCaptions: true,
    videoHeight: 360,
    theme: 'system',
    uiLanguage: 'system',
    autoCheckUpdates: true,
    previewCacheMaxGB: 5,
    recordingSource: DEFAULT_RECORDING_SOURCE,
    recordingMicId: '',
    recordingsDir: '',
    recordShortcut: DEFAULT_RECORD_SHORTCUT,
    suggestMeetingRecording: true,
    dockPosition: DEFAULT_DOCK_POSITION,
    queue: { skipExistingSrt: false, autoSaveSrt: false },
    window: { width: 1100, height: 790, maximized: false }
  }
}
