/** Extensiones mínimas que acepta la app (spec §3). ffmpeg puede leer más. */
export const VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'mpg', 'mpeg', 'ts', 'm2ts', '3gp', 'ogv'
] // prettier-ignore

export const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'amr', 'mka'
] // prettier-ignore

const MEDIA_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS])

/** Si la extensión del archivo es una de las admitidas (sin distinguir mayúsculas). */
export function hasMediaExtension(path: string): boolean {
  const name = path.replace(/^.*[\\/]/, '')
  const dot = name.lastIndexOf('.')
  return dot > 0 && MEDIA_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

export type MediaFilterKey = 'allMedia' | 'video' | 'audio' | 'allFiles'

/** Orden de los filtros en el diálogo Abrir. El primero es el que sale seleccionado. */
export const MEDIA_FILTER_KEYS: readonly MediaFilterKey[] = [
  'allMedia',
  'video',
  'audio',
  'allFiles'
]

const FILTER_EXTENSIONS: Record<MediaFilterKey, string[]> = {
  allMedia: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS],
  video: VIDEO_EXTENSIONS,
  audio: AUDIO_EXTENSIONS,
  // "Todos los archivos" igual se intenta con ffmpeg; si no hay audio, error claro.
  allFiles: ['*']
}

/**
 * Filtros para `dialog.showOpenDialog` (misma forma que `Electron.FileFilter`).
 * Los nombres llegan traducidos (`fileFilters.<key>` en los locales).
 */
export function mediaFileFilters(
  label: (key: MediaFilterKey) => string
): { name: string; extensions: string[] }[] {
  return MEDIA_FILTER_KEYS.map((key) => ({ name: label(key), extensions: FILTER_EXTENSIONS[key] }))
}

/**
 * Lista blanca de lo que Chromium reproduce sin vista previa (tarea 11). `format_name`
 * de ffprobe: `mov,mp4,m4a,3gp,3g2,mj2` para MP4/MOV y `matroska,webm` para MKV/WebM.
 */
export const PLAYABLE_CONTAINERS = ['mp4', 'matroska', 'webm', 'ogg', 'mp3', 'wav', 'flac']
export const PLAYABLE_VIDEO_CODECS = ['h264', 'vp8', 'vp9', 'av1']
export const PLAYABLE_AUDIO_CODECS = [
  'aac',
  'opus',
  'mp3',
  'vorbis',
  'flac',
  'pcm_s16le',
  'pcm_f32le'
]

/**
 * Si Chromium puede reproducir el archivo tal cual. `videoCodec` es `null` en archivos
 * de solo audio y `audioCodec` es el de la pista que se va a oír (la primera).
 */
export function isChromiumPlayable(
  container: string,
  videoCodec: string | null,
  audioCodec: string | null
): boolean {
  const containers = container.toLowerCase().split(',')
  if (!containers.some((c) => PLAYABLE_CONTAINERS.includes(c))) return false
  if (videoCodec !== null && !PLAYABLE_VIDEO_CODECS.includes(videoCodec.toLowerCase())) {
    return false
  }
  return audioCodec === null || PLAYABLE_AUDIO_CODECS.includes(audioCodec.toLowerCase())
}
