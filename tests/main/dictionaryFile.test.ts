import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseDictionaryFile } from '../../src/main/domain/dictionary'
import { JsonDictionaryRepository } from '../../src/main/infrastructure/persistence/jsonDictionaryRepository'

describe('parseDictionaryFile', () => {
  it('normaliza las entradas y descarta las que no valen', () => {
    const entries = parseDictionaryFile({
      version: 1,
      entries: [
        { id: 'a', spoken: [' cua ', 'cua', ''], written: ' QA ', plural: 'no' },
        { id: 'b', spoken: 'jompas', written: 'home pass', enabled: false },
        { id: 'c', spoken: [], written: 'nada' },
        { id: 'd', spoken: ['x'], written: '  ' },
        'basura'
      ]
    })
    expect(entries).toEqual([
      { id: 'a', spoken: ['cua'], written: 'QA', plural: false, enabled: true },
      { id: 'b', spoken: ['jompas'], written: 'home pass', plural: false, enabled: false }
    ])
  })

  it('acepta la lista sola, pone id a las que no tienen y no repite ids', () => {
    const entries = parseDictionaryFile([
      { spoken: ['a'], written: 'A' },
      { id: 'x', spoken: ['b'], written: 'B' },
      { id: 'x', spoken: ['c'], written: 'C' }
    ])
    expect(entries.map((e) => e.id)).toEqual(['entry-0', 'x', 'x-2'])
  })

  it('cualquier otra cosa es un diccionario vacío', () => {
    expect(parseDictionaryFile(null)).toEqual([])
    expect(parseDictionaryFile({ entries: 'x' })).toEqual([])
  })
})

describe('JsonDictionaryRepository', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'rw-dictionary-'))
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('sin archivo está vacío; guarda validado y lo vuelve a leer', async () => {
    const path = join(dir, 'dictionary.json')
    const repo = new JsonDictionaryRepository({ path })
    expect(await repo.load()).toEqual([])
    const saved = await repo.save([{ id: 'qa', spoken: ['cua'], written: 'QA' }, { bad: 1 }])
    expect(saved).toHaveLength(1)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ version: 1, entries: saved })
    expect(await new JsonDictionaryRepository({ path }).load()).toEqual(saved)
  })

  it('lee un archivo escrito a mano', async () => {
    const path = join(dir, 'dictionary.json')
    await writeFile(path, JSON.stringify([{ spoken: ['cua'], written: 'QA', plural: true }]))
    const [entry] = await new JsonDictionaryRepository({ path }).load()
    expect(entry).toMatchObject({ spoken: ['cua'], written: 'QA', plural: true, enabled: true })
  })
})
