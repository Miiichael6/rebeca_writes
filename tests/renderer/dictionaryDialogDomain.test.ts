import { describe, expect, it } from 'vitest'
import type { DictionaryEntry } from '@shared/dictionary'
import {
  DictionaryFileError,
  mergeEntries,
  parseCsv,
  parseJson,
  serializeCsv,
  serializeJson
} from '@renderer/components/DictionaryDialog/domain/dictionaryFile'
import {
  addSpoken,
  filterEntries,
  formKey,
  isComplete,
  ownerOfForm,
  savableEntries
} from '@renderer/components/DictionaryDialog/domain/entries'

const entry = (id: string, spoken: string[], written: string, extra = {}): DictionaryEntry => ({
  id,
  spoken,
  written,
  plural: false,
  enabled: true,
  ...extra
})

const DICTIONARY = [
  entry('1', ['jompas', 'jom pas'], 'home pass'),
  entry('2', ['id trabajo'], 'ID_Trabajo', { plural: true }),
  entry('3', ['cua', 'kiu ei'], 'QA', { enabled: false })
]

/** La entrada sin su id, como queda al exportarla. */
function withoutId(e: DictionaryEntry): Omit<DictionaryEntry, 'id'> {
  const copy: Partial<DictionaryEntry> = { ...e }
  delete copy.id
  return copy as Omit<DictionaryEntry, 'id'>
}

let next = 0
const createId = (): string => `new-${++next}`

describe('entradas', () => {
  it('compara formas sin mayúsculas, tildes ni puntuación', () => {
    expect(formKey('  Kiú-Ei ')).toBe('kiu ei')
  })

  it('solo guarda las completas', () => {
    expect(isComplete(entry('a', [], 'QA'))).toBe(false)
    expect(isComplete(entry('a', ['cua'], '  '))).toBe(false)
    expect(savableEntries([entry('a', ['cua'], ''), DICTIONARY[0]])).toEqual([DICTIONARY[0]])
  })

  it('encuentra la palabra que ya usa una forma, salvo la propia', () => {
    expect(ownerOfForm(DICTIONARY, 'Jom, pas')?.id).toBe('1')
    expect(ownerOfForm(DICTIONARY, 'jompas', '1')).toBeUndefined()
  })

  it('no añade formas vacías ni repetidas', () => {
    const e = DICTIONARY[0]
    expect(addSpoken(e, 'JOMPAS')).toBe(e)
    expect(addSpoken(e, '  ')).toBe(e)
    expect(addSpoken(e, ' yompas ').spoken).toEqual(['jompas', 'jom pas', 'yompas'])
  })

  it('filtra por lo que se escucha o lo que se escribe', () => {
    expect(filterEntries(DICTIONARY, 'trabajo').map((e) => e.id)).toEqual(['2'])
    expect(filterEntries(DICTIONARY, 'kiu').map((e) => e.id)).toEqual(['3'])
    expect(filterEntries(DICTIONARY, '  ')).toBe(DICTIONARY)
  })
})

describe('CSV', () => {
  it('serializa y vuelve a leer lo mismo (sin el estado activo)', () => {
    const parsed = parseCsv(serializeCsv(DICTIONARY))
    expect(parsed).toEqual(DICTIONARY.map((e) => ({ ...withoutId(e), enabled: true })))
  })

  it('acepta comas, plural escrito de varias formas y salta comentarios y filas incompletas', () => {
    const csv = '# comentario\r\ncua|q a,QA,sí\n\njompas;home pass;\nsolo hablado;;1\n'
    expect(parseCsv(csv)).toEqual([
      { spoken: ['cua', 'q a'], written: 'QA', plural: true, enabled: true },
      { spoken: ['jompas'], written: 'home pass', plural: false, enabled: true }
    ])
  })

  it('quita separadores de las celdas al exportar', () => {
    expect(serializeCsv([entry('x', ['a;b'], 'c|d')])).toContain('a b;c d;0')
  })
})

describe('JSON', () => {
  it('serializa sin ids y vuelve a leer lo mismo', () => {
    const json = serializeJson(DICTIONARY)
    expect(json).not.toContain('"id"')
    expect(parseJson(json)).toEqual(DICTIONARY.map(withoutId))
  })

  it('acepta solo la lista y descarta lo inválido', () => {
    const json = JSON.stringify([
      { spoken: 'cua', written: 'QA' },
      { spoken: ['', 'x'], written: '' },
      'basura'
    ])
    expect(parseJson(json)).toEqual([
      { spoken: ['cua'], written: 'QA', plural: false, enabled: true }
    ])
  })

  it('avisa si no es un diccionario', () => {
    expect(() => parseJson('{')).toThrow(DictionaryFileError)
    expect(() => parseJson('{"a":1}')).toThrow(DictionaryFileError)
  })
})

describe('fusionar al importar', () => {
  it('importar lo exportado deja el diccionario igual', () => {
    for (const imported of [
      parseJson(serializeJson(DICTIONARY)),
      parseCsv(serializeCsv(DICTIONARY))
    ]) {
      const result = mergeEntries(DICTIONARY, imported, createId)
      expect(result).toEqual({ entries: DICTIONARY, added: 0, updated: 0 })
    }
  })

  it('exportar, vaciar e importar recupera las palabras', () => {
    const result = mergeEntries([], parseJson(serializeJson(DICTIONARY)), createId)
    expect(result.added).toBe(3)
    expect(result.entries.map(withoutId)).toEqual(DICTIONARY.map(withoutId))
  })

  it('completa la palabra con el mismo «Escribir como» y no duplica formas de otra', () => {
    const imported = [
      { spoken: ['q a', 'jompas'], written: 'qa', plural: true, enabled: true },
      { spoken: ['jom pas'], written: 'Home Pass!', plural: false, enabled: true },
      { spoken: ['cuenta'], written: 'Cuenta', plural: false, enabled: true }
    ]
    const result = mergeEntries(DICTIONARY, imported, createId)
    expect(result.updated).toBe(1)
    expect(result.added).toBe(1)
    const qa = result.entries.find((e) => e.id === '3')
    expect(qa).toEqual({ ...DICTIONARY[2], spoken: ['cua', 'kiu ei', 'q a'], plural: true })
    expect(result.entries.at(-1)).toMatchObject({ spoken: ['cuenta'], written: 'Cuenta' })
  })
})
