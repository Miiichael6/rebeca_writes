import { DICTIONARY_VERSION, type DictionaryEntry } from '@shared/dictionary'
import { normalize } from '@shared/normalize'
import { addSpoken, formKey, isComplete, ownerOfForm } from './entries'

/**
 * Importar y exportar el diccionario (tarea 42). JSON: el mismo formato que `dictionary.json`.
 * CSV: una palabra por línea, `hablado1|hablado2;escrito;plural`; las líneas con `#` se saltan.
 */

/** Entrada leída de un archivo, todavía sin id. */
export type ImportedEntry = Omit<DictionaryEntry, 'id'>

const CSV_SEPARATOR = ';'
/** Excel en inglés guarda con comas: si una línea no tiene `;`, se prueba con `,`. */
const CSV_FALLBACK_SEPARATOR = ','
const SPOKEN_SEPARATOR = '|'
const COMMENT = '#'
const CSV_HEADER = `${COMMENT} hablado1${SPOKEN_SEPARATOR}hablado2${CSV_SEPARATOR}escrito${CSV_SEPARATOR}plural`
const PLURAL_YES = new Set(['1', 'true', 'si', 'yes', 'sim', 'x', 'plural'])

export class DictionaryFileError extends Error {}

/** Quita lo que rompería una celda del CSV. */
function csvCell(text: string): string {
  return text.replace(/[;|\r\n]+/g, ' ').trim()
}

export function serializeCsv(entries: readonly DictionaryEntry[]): string {
  const lines = entries.map((e) =>
    [e.spoken.map(csvCell).join(SPOKEN_SEPARATOR), csvCell(e.written), e.plural ? '1' : '0'].join(
      CSV_SEPARATOR
    )
  )
  return [CSV_HEADER, ...lines].join('\r\n') + '\r\n'
}

export function parseCsv(content: string): ImportedEntry[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(COMMENT))
    .map((line) => {
      const separator = line.includes(CSV_SEPARATOR) ? CSV_SEPARATOR : CSV_FALLBACK_SEPARATOR
      const [spoken = '', written = '', plural = ''] = line.split(separator)
      return {
        spoken: spoken.split(SPOKEN_SEPARATOR).map((s) => s.trim()),
        written: written.trim(),
        plural: PLURAL_YES.has(normalize(plural.trim())),
        enabled: true
      }
    })
    .map(cleanImported)
    .filter((e): e is ImportedEntry => e !== null)
}

export function serializeJson(entries: readonly DictionaryEntry[]): string {
  const list = entries.map(({ spoken, written, plural, enabled }) => ({
    spoken,
    written,
    plural,
    enabled
  }))
  return JSON.stringify({ version: DICTIONARY_VERSION, entries: list }, null, 2) + '\n'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Formas habladas sin vacías ni repetidas (comparadas como las compara el diccionario). */
function uniqueForms(forms: readonly string[]): string[] {
  const seen = new Set<string>()
  return forms
    .map((form) => form.trim())
    .filter((form) => {
      const key = formKey(form)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Entrada con formas limpias, o `null` si le falta qué buscar o qué poner. */
function cleanImported(entry: ImportedEntry): ImportedEntry | null {
  const clean = { ...entry, spoken: uniqueForms(entry.spoken), written: entry.written.trim() }
  return isComplete({ id: '', ...clean }) ? clean : null
}

/** Acepta `{ version, entries }` (lo que exporta la app) o solo la lista. */
export function parseJson(content: string): ImportedEntry[] {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new DictionaryFileError('JSON inválido')
  }
  const list = isRecord(raw) ? raw.entries : raw
  if (!Array.isArray(list)) throw new DictionaryFileError('Sin lista de palabras')
  return list
    .filter(isRecord)
    .map((item) => ({
      spoken: (Array.isArray(item.spoken) ? item.spoken : [item.spoken]).filter(
        (s): s is string => typeof s === 'string'
      ),
      written: typeof item.written === 'string' ? item.written : '',
      plural: item.plural === true,
      enabled: item.enabled !== false
    }))
    .map(cleanImported)
    .filter((e): e is ImportedEntry => e !== null)
}

export interface MergeResult {
  entries: DictionaryEntry[]
  /** Palabras nuevas. */
  added: number
  /** Palabras que ya estaban y cambiaron (formas habladas nuevas o plural). */
  updated: number
}

/**
 * Junta lo importado con lo que hay. Una palabra con el mismo «Escribir como» se completa
 * (suma formas habladas y toma el plural del archivo; su estado activo no cambia); las demás
 * se añaden. Una forma hablada que ya usa otra palabra se descarta, para no duplicarla.
 * Importar lo mismo que se exportó no cambia nada.
 */
export function mergeEntries(
  current: readonly DictionaryEntry[],
  imported: readonly ImportedEntry[],
  createId: () => string
): MergeResult {
  const entries = [...current]
  let added = 0
  let updated = 0
  for (const item of imported) {
    const writtenKey = normalize(item.written)
    const index = entries.findIndex((e) => normalize(e.written.trim()) === writtenKey)
    const target = index === -1 ? null : entries[index]
    const freeForms = item.spoken.filter((form) => !ownerOfForm(entries, form, target?.id))
    if (target) {
      const merged = freeForms.reduce(addSpoken, { ...target, plural: item.plural })
      const changed =
        merged.spoken.length !== target.spoken.length || merged.plural !== target.plural
      if (changed) {
        entries[index] = merged
        updated++
      }
    } else if (freeForms.length > 0) {
      entries.push({ ...item, id: createId(), spoken: freeForms })
      added++
    }
  }
  return { entries, added, updated }
}
