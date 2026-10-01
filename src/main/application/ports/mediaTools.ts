import type { MediaInfo } from '@shared/types'

export interface ToWavOptions {
  /** Carpeta del trabajo; se crea si no existe y se borra entera si falla o se cancela. */
  outDir: string
  /** Posición entre las pistas de audio (`AudioTrack.index`). Por defecto la primera. */
  track?: number
  /** Filtro `loudnorm` (Configuración › Normalización de audio). */
  normalize?: boolean
  /** Duración de `probe`, para calcular el porcentaje. */
  durationSec?: number
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/** Puerto de salida: analizar un medio y sacar su audio como WAV para whisper. */
export interface MediaTools {
  /**
   * Analiza el archivo. Falla con `MediaError` `unreadableMedia` si no lo entiende y con
   * `noAudioStream` si no tiene ninguna pista de audio.
   */
  probe(file: string): Promise<MediaInfo>
  /** Convierte la pista elegida a `<outDir>/audio.wav` y devuelve su ruta. */
  toWav(file: string, options: ToWavOptions): Promise<string>
}
