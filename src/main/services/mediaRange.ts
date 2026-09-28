import { extname } from 'path'

/** Rango de bytes inclusivo, como en `Content-Range: bytes start-end/size`. */
export interface ByteRange {
  start: number
  end: number
}

/**
 * Interpreta la cabecera `Range` para un archivo de `size` bytes.
 * - `null`: no hay cabecera (o viene vacía) → se sirve el archivo completo con 200.
 * - `'invalid'`: sintaxis mala, unidad distinta de `bytes`, varios rangos o rango fuera
 *   del archivo → 416. Chromium solo pide un rango por petición, así que no se soporta
 *   `multipart/byteranges`.
 */
export function parseRange(header: string | null, size: number): ByteRange | null | 'invalid' {
  if (header === null || header.trim() === '') return null

  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header)
  if (!match) return 'invalid'
  const [, rawStart, rawEnd] = match
  if (size <= 0) return 'invalid'

  // bytes=-N → los últimos N bytes.
  if (rawStart === '') {
    if (rawEnd === '') return 'invalid'
    const suffix = Number(rawEnd)
    if (suffix === 0) return 'invalid'
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }

  const start = Number(rawStart)
  if (start >= size) return 'invalid'
  // bytes=N- → hasta el final. Un `end` más allá del archivo se recorta (RFC 9110 §14.1.2).
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  if (end < start) return 'invalid'
  return { start, end }
}

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  ts: 'video/mp2t',
  m2ts: 'video/mp2t',
  '3gp': 'video/3gpp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mka: 'audio/x-matroska',
  wma: 'audio/x-ms-wma',
  aiff: 'audio/aiff',
  amr: 'audio/amr'
}

/** `Content-Type` por extensión; lo desconocido va como binario y Chromium lo detecta. */
export function mimeTypeFor(filePath: string): string {
  const ext = extname(filePath).slice(1).toLowerCase()
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}
