/**
 * El archivo final de una grabación (tarea 29): nombre válido en Windows a partir del nombre de
 * la entrada, sin pisar uno que ya exista, y la conversión del `.pcm` en vivo a MP3 o WAV.
 */

import type { RecordingFormat } from '@shared/recording'
import { BYTES_PER_SAMPLE, SAMPLE_RATE } from '../liveWindows'

/** Calidad VBR de LAME: ~165 kb/s, de sobra para voz y lo que suena en el equipo. */
const MP3_QUALITY = '4'
const FALLBACK_NAME = 'recording'
// Los caracteres de control (0–31) tampoco valen en un nombre de archivo de Windows.
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

/** Quita lo que Windows no admite en un nombre de archivo (y los puntos o espacios del final). */
export function recordingFileName(name: string): string {
  const cleaned = name
    .replace(INVALID_CHARS, '-')
    .replace(/[. ]+$/, '')
    .trim()
  return cleaned || FALLBACK_NAME
}

/** `nombre.mp3`, y si ya existe `nombre (2).mp3`, `nombre (3).mp3`... */
export function numberedFileName(base: string, attempt: number, format: RecordingFormat): string {
  return attempt <= 1 ? `${base}.${format}` : `${base} (${attempt}).${format}`
}

/** Códec de salida: LAME para MP3; para WAV, las mismas muestras del `.pcm` con cabecera. */
function codecArgs(format: RecordingFormat): string[] {
  switch (format) {
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-q:a', MP3_QUALITY]
    case 'wav':
      return ['-c:a', `pcm_s${BYTES_PER_SAMPLE * 8}le`]
  }
}

/** Argumentos de ffmpeg para pasar el `.pcm` (s16le, 16 kHz, mono, sin cabecera) a `format`. */
export function encodeArgs(pcm: string, out: string, format: RecordingFormat): string[] {
  return [
    '-y',
    '-hide_banner',
    '-f',
    `s${BYTES_PER_SAMPLE * 8}le`,
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    '1',
    '-i',
    pcm,
    ...codecArgs(format),
    out
  ]
}
