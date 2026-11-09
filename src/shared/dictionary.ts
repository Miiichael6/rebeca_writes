import { normalize } from './normalize'
import type { Segment } from './types'

/**
 * Diccionario de reemplazos (tarea 41): palabras que whisper oye mal y cómo se escriben. Se
 * aplica en dos capas: las formas correctas van al `--prompt` para que acierte desde el
 * principio, y lo que siga saliendo mal se reemplaza en cada segmento.
 */

export interface DictionaryEntry {
  id: string
  /** Cómo lo oye whisper: `cua`, `kiu ei`, `q a`. */
  spoken: string[]
  /** Cómo debe quedar: `QA`. */
  written: string
  /** Acepta `s`/`es` al final y lo conserva: «id trabajos» → «ID_Trabajos». */
  plural: boolean
  enabled: boolean
}

/** Versión del formato de `dictionary.json` y de los `.json` exportados. */
export const DICTIONARY_VERSION = 1

/** Tope de tokens del `--prompt` de whisper (n_text_ctx / 2 = 224), con margen. */
const PROMPT_TOKEN_BUDGET = 220
/** Estimación conservadora sin tokenizador: palabras raras y mayúsculas gastan más tokens. */
const CHARS_PER_TOKEN = 2.5
const PROMPT_CHAR_BUDGET = Math.floor(PROMPT_TOKEN_BUDGET * CHARS_PER_TOKEN)
const PROMPT_SEPARATOR = ', '
const PLURAL_SUFFIXES = ['es', 's'] as const

/** Una palabra: letras, números y `_` (así `ID_Trabajo` ya corregido no vuelve a coincidir). */
const WORD = /[\p{L}\p{M}\p{N}_]+/gu

interface Word {
  /** Normalizada: sin mayúsculas ni tildes. */
  key: string
  start: number
  end: number
}

interface Pattern {
  words: string[]
  written: string
  plural: boolean
}

function wordsOf(text: string): Word[] {
  return [...text.matchAll(WORD)].map((m) => ({
    key: normalize(m[0]),
    start: m.index,
    end: m.index + m[0].length
  }))
}

/** Las entradas que se aplican: activas y con algo que buscar y algo que poner. */
export function activeEntries(entries: readonly DictionaryEntry[]): DictionaryEntry[] {
  return entries.filter((e) => e.enabled && e.written.trim() && e.spoken.some((s) => s.trim()))
}

/** Una forma hablada por patrón, la de más palabras (y más letras) primero. */
function patternsOf(entries: readonly DictionaryEntry[]): Pattern[] {
  const patterns = activeEntries(entries).flatMap((e) =>
    e.spoken
      .map((s) => wordsOf(s).map((w) => w.key))
      .filter((words) => words.length > 0)
      .map((words) => ({ words, written: e.written.trim(), plural: e.plural }))
  )
  const letters = (p: Pattern): number => p.words.join('').length
  return patterns.sort((a, b) => b.words.length - a.words.length || letters(b) - letters(a))
}

/** Sufijo de plural que lleva `word` respecto a `expected` (`''` si es igual), o `null`. */
function pluralSuffix(word: string, expected: string, plural: boolean): string | null {
  if (word === expected) return ''
  if (!plural) return null
  return PLURAL_SUFFIXES.find((s) => word === expected + s) ?? null
}

interface Match {
  /** Palabras que se consumen. */
  length: number
  replacement: string
}

/** ¿Empieza `pattern` en `words[at]`? Solo palabras completas; la última puede ir en plural. */
function matchAt(text: string, words: Word[], at: number, pattern: Pattern): Match | null {
  const last = pattern.words.length - 1
  if (at + last >= words.length) return null
  for (let i = 0; i < last; i++) {
    if (words[at + i].key !== pattern.words[i]) return null
  }
  const lastWord = words[at + last]
  const suffix = pluralSuffix(lastWord.key, pattern.words[last], pattern.plural)
  if (suffix === null) return null
  // El sufijo se copia tal cual se escribió (respeta «TRABAJOS»).
  const kept = suffix ? text.slice(lastWord.end - suffix.length, lastWord.end) : ''
  return { length: last + 1, replacement: pattern.written + kept }
}

/** Trozo del resultado: texto copiado tal cual o puesto por el diccionario. */
export interface DictionaryPart {
  text: string
  replaced: boolean
}

/**
 * `text` partido en trozos sin tocar y trozos reemplazados (para resaltarlos al probar el
 * diccionario). Unidos dan `applyDictionary(text, entries)`.
 */
export function dictionaryParts(
  text: string,
  entries: readonly DictionaryEntry[]
): DictionaryPart[] {
  const patterns = patternsOf(entries)
  const parts: DictionaryPart[] = []
  const keep = (slice: string): void => {
    if (slice) parts.push({ text: slice, replaced: false })
  }
  const words = patterns.length > 0 ? wordsOf(text) : []
  let copiedUpTo = 0
  for (let at = 0; at < words.length;) {
    const match = patterns.reduce<Match | null>(
      (found, p) => found ?? matchAt(text, words, at, p),
      null
    )
    if (!match) {
      at++
      continue
    }
    keep(text.slice(copiedUpTo, words[at].start))
    parts.push({ text: match.replacement, replaced: true })
    copiedUpTo = words[at + match.length - 1].end
    at += match.length
  }
  keep(text.slice(copiedUpTo))
  return parts
}

/**
 * Reemplaza en `text` las formas habladas por su forma escrita. Compara sin mayúsculas ni
 * tildes, ignora la puntuación y los espacios entre palabras y solo toca palabras completas
 * (`cua` no cambia `cuadro`). Sin coincidencia aproximada: da demasiados falsos positivos.
 */
export function applyDictionary(text: string, entries: readonly DictionaryEntry[]): string {
  return dictionaryParts(text, entries)
    .map((p) => p.text)
    .join('')
}

/**
 * Segmento corregido por el diccionario. Si cambia, guarda el texto de whisper en
 * `originalText` sin marcarlo `edited`: no es una edición del usuario, pero se puede restaurar.
 */
export function correctSegment(segment: Segment, entries: readonly DictionaryEntry[]): Segment {
  const text = applyDictionary(segment.text, entries)
  if (text === segment.text) return segment
  return { ...segment, text, originalText: segment.originalText ?? segment.text }
}

/** Recorta `text` por el principio, en un límite de palabra, para que quepa en `max` letras. */
function keepTail(text: string, max: number): string {
  if (text.length <= max) return text
  if (max <= 0) return ''
  const tail = text.slice(text.length - max)
  const space = tail.indexOf(' ')
  return (space === -1 ? '' : tail.slice(space + 1)).trim()
}

/**
 * `--prompt` con las formas escritas del diccionario detrás del prompt de Configuración
 * (`basePrompt`, ya `undefined` si está apagado). Whisper solo mira los últimos ~224 tokens:
 * las palabras del diccionario tienen prioridad y del prompt base queda lo que quepa por el
 * final. Sin entradas activas devuelve `basePrompt` tal cual.
 */
export function dictionaryPrompt(
  entries: readonly DictionaryEntry[],
  basePrompt: string | undefined
): string | undefined {
  const words: string[] = []
  let length = 0
  for (const written of new Set(activeEntries(entries).map((e) => e.written.trim()))) {
    const added = (words.length > 0 ? PROMPT_SEPARATOR.length : 0) + written.length
    if (length + added > PROMPT_CHAR_BUDGET) break
    words.push(written)
    length += added
  }
  if (words.length === 0) return basePrompt
  const vocabulary = words.join(PROMPT_SEPARATOR)
  const base = basePrompt ? keepTail(basePrompt.trim(), PROMPT_CHAR_BUDGET - length - 1) : ''
  return base ? `${base} ${vocabulary}` : vocabulary
}

/** Formatos para importar y exportar el diccionario (tarea 42). */
export const DICTIONARY_FILE_FORMATS = ['json', 'csv'] as const
export type DictionaryFileFormat = (typeof DICTIONARY_FILE_FORMATS)[number]

export function isDictionaryFileFormat(value: unknown): value is DictionaryFileFormat {
  return DICTIONARY_FILE_FORMATS.includes(value as DictionaryFileFormat)
}

/** Archivo elegido al importar: su formato (por la extensión) y su texto. */
export interface DictionaryImportedFile {
  format: DictionaryFileFormat
  content: string
}
