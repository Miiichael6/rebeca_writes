import { paragraphText, toParagraphs } from './joinLines'
import type { Segment } from './types'
import { AUTO_LANGUAGE } from './whisper'

/**
 * Exportadores de la transcripción (spec §4.1). Funciones puras: el main las usa para
 * escribir los archivos (menú Exportar y el .srt automático de la cola) y el renderer para
 * copiar al portapapeles. Todo sale con `\n` y sin BOM; el main lo escribe en UTF-8.
 */

export type ExportFormat = 'txtTimestamps' | 'txt' | 'vtt' | 'lrc' | 'srt'

export const EXPORT_FORMATS: readonly ExportFormat[] = ['txtTimestamps', 'txt', 'vtt', 'lrc', 'srt']

/** Extensión de archivo de cada formato (sin punto). */
export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  txtTimestamps: 'txt',
  txt: 'txt',
  vtt: 'vtt',
  lrc: 'lrc',
  srt: 'srt'
}

export interface ExportOptions {
  /** Solo `.txt`: párrafos como con "Unir líneas". */
  joined?: boolean
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** `hh:mm:ss` + separador + `mmm`. Se redondea a milisegundos antes de partir. */
function clockMs(sec: number, separator: string): string {
  const totalMs = Math.max(0, Math.round(sec * 1000))
  const h = Math.floor(totalMs / 3_600_000)
  const m = Math.floor((totalMs % 3_600_000) / 60_000)
  const s = Math.floor((totalMs % 60_000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(totalMs % 1000, 3)}`
}

/** `hh:mm:ss,mmm` (1.9999 s → `00:00:02,000`). */
export function srtTimestamp(sec: number): string {
  return clockMs(sec, ',')
}

/** `hh:mm:ss.mmm` */
export function vttTimestamp(sec: number): string {
  return clockMs(sec, '.')
}

/** `mm:ss.xx` en centésimas. Los minutos no pasan a horas (`61:02.50`). */
export function lrcTimestamp(sec: number): string {
  const totalCs = Math.max(0, Math.round(sec * 100))
  const m = Math.floor(totalCs / 6000)
  const s = Math.floor((totalCs % 6000) / 100)
  return `${pad(m)}:${pad(s)}.${pad(totalCs % 100)}`
}

/** `mm:ss`, o `h:mm:ss` desde la primera hora: las mismas marcas que muestra la vista. */
export function txtTimestamp(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Líneas no vacías del texto, recortadas. */
function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Texto en una sola línea (para formatos de una línea por segmento). */
function oneLine(text: string): string {
  return lines(text).join(' ')
}

/** Segmentos con texto; los vacíos no aportan nada a ningún formato. */
function withText(segments: readonly Segment[]): Segment[] {
  return segments.filter((s) => s.text.trim())
}

/** Une los bloques; con al menos uno, el archivo termina en salto de línea. */
function joinLinesOut(parts: string[], separator = '\n'): string {
  return parts.length > 0 ? parts.join(separator) + '\n' : ''
}

/** SubRip: índice, `inicio --> fin`, texto y línea en blanco. */
export function toSrt(segments: readonly Segment[]): string {
  return joinLinesOut(
    withText(segments).map(
      (s, i) =>
        `${i + 1}\n${srtTimestamp(s.start)} --> ${srtTimestamp(s.end)}\n${lines(s.text).join('\n')}`
    ),
    '\n\n'
  )
}

/** En el texto de un cue de WebVTT `&`, `<` y `>` van escapados (y así nunca aparece `-->`). */
function escapeVtt(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** WebVTT: cabecera `WEBVTT` y cues `hh:mm:ss.mmm --> hh:mm:ss.mmm`. */
export function toVtt(segments: readonly Segment[]): string {
  const cues = withText(segments).map(
    (s) =>
      `${vttTimestamp(s.start)} --> ${vttTimestamp(s.end)}\n${lines(s.text).map(escapeVtt).join('\n')}`
  )
  return joinLinesOut(['WEBVTT', ...cues], '\n\n')
}

/** LRC: `[mm:ss.xx]texto`, una línea por segmento. */
export function toLrc(segments: readonly Segment[]): string {
  return joinLinesOut(withText(segments).map((s) => `[${lrcTimestamp(s.start)}]${oneLine(s.text)}`))
}

/** `[mm:ss] texto`, una línea por segmento. */
export function toTxtTimestamps(segments: readonly Segment[]): string {
  return joinLinesOut(
    withText(segments).map((s) => `[${txtTimestamp(s.start)}] ${oneLine(s.text)}`)
  )
}

/**
 * Texto plano. Con `joined`, párrafos separados por una línea en blanco ("Unir líneas");
 * sin él, un segmento por línea.
 */
export function toTxt(
  segments: readonly Segment[],
  { joined = false }: ExportOptions = {}
): string {
  if (joined) {
    const paragraphs = toParagraphs(segments)
      .map((p) => oneLine(paragraphText(segments, p)))
      .filter(Boolean)
    return joinLinesOut(paragraphs, '\n\n')
  }
  return joinLinesOut(withText(segments).map((s) => oneLine(s.text)))
}

export function exportTranscript(
  format: ExportFormat,
  segments: readonly Segment[],
  options: ExportOptions = {}
): string {
  switch (format) {
    case 'txtTimestamps':
      return toTxtTimestamps(segments)
    case 'txt':
      return toTxt(segments, options)
    case 'vtt':
      return toVtt(segments)
    case 'lrc':
      return toLrc(segments)
    case 'srt':
      return toSrt(segments)
  }
}

/** Nombre sin la última extensión: `clase.01.mp4` → `clase.01`. */
export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** `<archivo sin ext>.<idioma>.srt`, el nombre que reconocen Jellyfin y Plex. */
export function srtFileName(fileName: string, language: string): string {
  return `${baseName(fileName)}.${language}.srt`
}

/**
 * Código de idioma del `.srt` junto al archivo: `en` si se tradujo, el elegido, o el
 * detectado si se pidió `auto` (`und`, "sin determinar", si no se llegó a detectar).
 */
export function srtLanguage(o: {
  language: string
  detectedLanguage?: string
  translate?: boolean
}): string {
  if (o.translate) return 'en'
  if (o.language !== AUTO_LANGUAGE) return o.language
  return o.detectedLanguage || 'und'
}

/**
 * ¿Hay un subtítulo para `fileName` entre `siblings` (nombres de la misma carpeta)?
 * Vale `<nombre>.srt` y `<nombre>.<lo que sea>.srt`, sin distinguir mayúsculas (Windows).
 */
export function hasSiblingSrt(fileName: string, siblings: string[]): boolean {
  const base = baseName(fileName).toLowerCase()
  return siblings.some((name) => {
    const n = name.toLowerCase()
    return n === `${base}.srt` || (n.startsWith(`${base}.`) && n.endsWith('.srt'))
  })
}
