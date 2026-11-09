import { DICTIONARY_VERSION, type DictionaryEntry } from '@shared/dictionary'
import { isRecord } from './guards'

/**
 * Reglas de `dictionary.json` (tarea 41): lo que no vale se descarta, así un archivo editado
 * a mano nunca rompe la app.
 */

const MAX_ENTRIES = 1000
const MAX_SPOKEN_FORMS = 20
const MAX_TEXT_LENGTH = 200
const MAX_ID_LENGTH = 100

export interface DictionaryFile {
  version: number
  entries: DictionaryEntry[]
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().slice(0, MAX_TEXT_LENGTH)
  return text || null
}

/** Formas habladas sin vacías ni repetidas; acepta también una sola cadena. */
function spokenForms(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value]
  const forms = list.map(cleanText).filter((s): s is string => s !== null)
  return [...new Set(forms)].slice(0, MAX_SPOKEN_FORMS)
}

/** La entrada ya normalizada, o `null` si le falta qué buscar o qué poner. */
function parseEntry(raw: unknown, index: number): DictionaryEntry | null {
  if (!isRecord(raw)) return null
  const spoken = spokenForms(raw.spoken)
  const written = cleanText(raw.written)
  if (spoken.length === 0 || !written) return null
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, MAX_ID_LENGTH) : ''
  return {
    id: id || `entry-${index}`,
    spoken,
    written,
    plural: raw.plural === true,
    enabled: raw.enabled !== false
  }
}

/** Entradas válidas con ids sin repetir (un id repetido se renombra con su posición). */
export function parseDictionaryEntries(raw: unknown): DictionaryEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const entries: DictionaryEntry[] = []
  raw.slice(0, MAX_ENTRIES).forEach((item, index) => {
    const entry = parseEntry(item, index)
    if (!entry) return
    if (seen.has(entry.id)) entry.id = `${entry.id}-${index}`
    seen.add(entry.id)
    entries.push(entry)
  })
  return entries
}

/** Lee el archivo en crudo: `{ version, entries }` o, escrito a mano, solo la lista. */
export function parseDictionaryFile(raw: unknown): DictionaryEntry[] {
  return parseDictionaryEntries(isRecord(raw) ? raw.entries : raw)
}

export function dictionaryFile(entries: DictionaryEntry[]): DictionaryFile {
  return { version: DICTIONARY_VERSION, entries }
}
