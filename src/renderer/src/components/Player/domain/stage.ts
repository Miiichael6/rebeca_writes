import { VIDEO_HEIGHT_MAX, VIDEO_HEIGHT_MIN } from '@shared/settings'

/** Margen superior del panel de video (debe coincidir con `.player-stage` en app.css). */
export const STAGE_MARGIN_TOP = 12

/** Si quedan menos px que estos para la transcripción, se considera tapada. */
export const COVER_THRESHOLD = 140

/** Cuánto cambia el alto del panel con cada pulsación de `↑/↓` en el asa. */
export const RESIZE_KEY_STEP_PX = 20

export interface StageMeasure {
  /** Alto útil de `.main`. */
  mainHeight: number
  /** Alto de lo que hay en `.main` aparte del reproductor y de la transcripción. */
  othersHeight: number
  /** Alto de la barra de controles del reproductor. */
  controlsHeight: number
}

/**
 * Alto máximo del panel: todo el espacio de `.main` que no ocupan la barra de herramientas, los
 * controles del reproductor y demás. Con ese alto el video tapa por completo la transcripción.
 */
export function stageLimit({ mainHeight, othersHeight, controlsHeight }: StageMeasure): number {
  return Math.min(VIDEO_HEIGHT_MAX, mainHeight - othersHeight - controlsHeight - STAGE_MARGIN_TOP)
}

/** Alto más grande que admite el panel con ese límite (nunca menos que el mínimo). */
export function maximizedHeight(limit: number): number {
  return Math.max(limit, VIDEO_HEIGHT_MIN)
}

/** Ajusta un alto al rango permitido y lo redondea a píxeles enteros. */
export function clampVideoHeight(height: number, limit: number): number {
  return Math.round(Math.max(VIDEO_HEIGHT_MIN, Math.min(maximizedHeight(limit), height)))
}

/** «Pantalla completa» = el asa llegó hasta abajo. */
export function isMaximized(height: number, limit: number): boolean {
  return height >= maximizedHeight(limit) - 1
}

/** Con el video ocupando casi todo el espacio, la transcripción pasa a ser una ventanita. */
export function isCovered(input: {
  hasMedia: boolean
  hasVideo: boolean
  videoVisible: boolean
  height: number
  limit: number
}): boolean {
  return (
    input.hasMedia &&
    input.hasVideo &&
    input.videoVisible &&
    input.height >= input.limit - COVER_THRESHOLD
  )
}

/**
 * Alto al que lleva el botón de maximizar: al máximo, o de vuelta al alto previo.
 * `restore` es el alto que había antes de maximizar.
 */
export function maximizeTarget(input: {
  maximized: boolean
  height: number
  restore: number
  limit: number
}): { height: number; restore: number } {
  const max = maximizedHeight(input.limit)
  if (input.maximized) return { height: Math.min(input.restore, max - 1), restore: input.restore }
  return { height: Math.round(max), restore: input.height }
}

/** Cambio de alto para una tecla sobre el asa: `↓` agranda, `↑` achica, el resto no hace nada. */
export function resizeKeyDelta(key: string): number {
  if (key === 'ArrowDown') return RESIZE_KEY_STEP_PX
  if (key === 'ArrowUp') return -RESIZE_KEY_STEP_PX
  return 0
}
