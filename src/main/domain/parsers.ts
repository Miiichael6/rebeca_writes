import { StringDecoder } from 'string_decoder'
import type { Segment } from '@shared/types'

/**
 * Parsers puros de la salida de `whisper-cli` (spec §2.3 paso 4). Sin Electron, para
 * poder probarlos con Vitest sin arrancar la app.
 */

const SEGMENT_RE = /^\[(\d{2,}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2,}:\d{2}:\d{2}\.\d{3})\]\s?(.*)$/
const PROGRESS_RE = /progress\s*=\s*(\d+)\s*%/
const LANGUAGE_RE = /auto-detected language:\s*([a-z]{2,3})/i

function timeToSeconds(timestamp: string): number {
  const [h, m, rest] = timestamp.split(':')
  const [s, ms] = rest.split('.')
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
}

/** Quita los cierres `)` y `]` que no abrió nadie antes. */
function dropUnopened(text: string): string {
  const open = { ')': 0, ']': 0 }
  let out = ''
  for (const char of text) {
    if (char === '(') open[')']++
    else if (char === '[') open[']']++
    else if (char === ')' || char === ']') {
      if (open[char] === 0) continue
      open[char]--
    }
    out += char
  }
  return out
}

/**
 * Limpia marcas que whisper copia de los subtítulos de TV: `>>` (cambio de quien habla) y
 * paréntesis o corchetes de cierre sueltos (`))`).
 */
export function cleanSegmentText(text: string): string {
  return dropUnopened(text.replace(/(?:>\s*){2,}/g, ' '))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * `[hh:mm:ss.mmm --> hh:mm:ss.mmm]  texto` → tramo en segundos, o `null` si la línea no encaja
 * o solo traía marcas sin texto.
 */
export function parseSegmentLine(line: string): Segment | null {
  const match = SEGMENT_RE.exec(line.trim())
  if (!match) return null
  const raw = match[3].trim()
  const text = cleanSegmentText(raw)
  if (raw && !text) return null
  return { start: timeToSeconds(match[1]), end: timeToSeconds(match[2]), text }
}

/** `whisper_print_progress_callback: progress = 42%` → `42`, o `null` si la línea no la trae. */
export function parseProgress(line: string): number | null {
  const match = PROGRESS_RE.exec(line)
  return match ? Number(match[1]) : null
}

/** `whisper_full_with_state: auto-detected language: es (...)` → `'es'`, o `null`. */
export function parseDetectedLanguage(line: string): string | null {
  const match = LANGUAGE_RE.exec(line)
  return match ? match[1].toLowerCase() : null
}

/**
 * Junta chunks de un stream de proceso y llama a `onLine` por cada línea completa, sin
 * partir un carácter UTF-8 multibyte que caiga justo en el borde de dos chunks.
 */
export class LineSplitter {
  private readonly decoder = new StringDecoder('utf8')
  private buffer = ''

  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: Buffer): void {
    this.buffer += this.decoder.write(chunk)
    const lines = this.buffer.split(/\r\n|\n/)
    this.buffer = lines.pop() ?? ''
    for (const line of lines) this.onLine(line)
  }

  /** El proceso terminó: entrega lo que quede en el buffer aunque no traiga salto de línea. */
  flush(): void {
    this.buffer += this.decoder.end()
    if (this.buffer) this.onLine(this.buffer)
    this.buffer = ''
  }
}
