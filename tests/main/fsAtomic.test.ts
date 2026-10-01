import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DebouncedJsonWriter,
  flushAllWrites,
  hasPendingWrites,
  readJsonSafe,
  writeJsonAtomic
} from '../../src/main/infrastructure/persistence/fsAtomic'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fsatomic-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('writeJsonAtomic', () => {
  it('escribe el JSON, crea la carpeta y no deja el .tmp', async () => {
    const path = join(dir, 'sub', 'data.json')
    await writeJsonAtomic(path, { a: 1 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ a: 1 })
    expect(await readdir(join(dir, 'sub'))).toEqual(['data.json'])
  })

  it('reemplaza el archivo existente', async () => {
    const path = join(dir, 'data.json')
    await writeJsonAtomic(path, { v: 1 })
    await writeJsonAtomic(path, { v: 2 })
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ v: 2 })
  })

  it('serializa las escrituras al mismo archivo: gana la última', async () => {
    const path = join(dir, 'data.json')
    await Promise.all(Array.from({ length: 20 }, (_, i) => writeJsonAtomic(path, { i })))
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ i: 19 })
    expect(hasPendingWrites()).toBe(false)
  })
})

describe('readJsonSafe', () => {
  it('devuelve el fallback si el archivo no existe', async () => {
    expect(await readJsonSafe(join(dir, 'nope.json'), { d: true })).toEqual({ d: true })
  })

  it('lee JSON con BOM', async () => {
    const path = join(dir, 'bom.json')
    await writeFile(path, '\uFEFF{"ok":true}', 'utf8')
    expect(await readJsonSafe(path, null)).toEqual({ ok: true })
  })

  it('aparta un JSON corrupto como .corrupt-<fecha> y devuelve el fallback', async () => {
    const path = join(dir, 'broken.json')
    await writeFile(path, '{"a": 1, "b":', 'utf8')
    const onCorrupt = vi.fn()
    expect(await readJsonSafe(path, 'fallback', onCorrupt)).toBe('fallback')

    const files = await readdir(dir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^broken\.json\.corrupt-\d{4}-\d{2}-\d{2}T[\d-]+Z$/)
    expect(await readFile(join(dir, files[0]), 'utf8')).toBe('{"a": 1, "b":')
    expect(onCorrupt).toHaveBeenCalledWith(join(dir, files[0]), expect.any(SyntaxError))
  })

  it('un archivo vacío también cuenta como corrupto', async () => {
    const path = join(dir, 'empty.json')
    await writeFile(path, '', 'utf8')
    expect(await readJsonSafe(path, [])).toEqual([])
    expect((await readdir(dir))[0]).toMatch(/^empty\.json\.corrupt-/)
  })
})

describe('DebouncedJsonWriter', () => {
  it('agrupa los cambios y escribe solo el último', async () => {
    vi.useFakeTimers()
    try {
      const path = join(dir, 'debounced.json')
      const writer = new DebouncedJsonWriter(path, 100)
      let state = 0
      for (let i = 1; i <= 5; i++) {
        state = i
        writer.schedule(() => ({ state }))
        vi.advanceTimersByTime(50)
      }
      expect(writer.pending).toBe(true)
      await expect(readFile(path, 'utf8')).rejects.toThrow()
      vi.useRealTimers()
      await writer.flush()
      expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ state: 5 })
      expect(writer.pending).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancel descarta lo pendiente', async () => {
    const path = join(dir, 'cancelled.json')
    const writer = new DebouncedJsonWriter(path, 10_000)
    writer.schedule(() => ({ x: 1 }))
    writer.cancel()
    await writer.flush()
    expect(await readdir(dir)).toEqual([])
  })

  it('flushAllWrites vacía todos los escritores', async () => {
    const a = new DebouncedJsonWriter(join(dir, 'a.json'), 10_000)
    const b = new DebouncedJsonWriter(join(dir, 'b.json'), 10_000)
    a.schedule(() => 'a')
    b.schedule(() => 'b')
    expect(hasPendingWrites()).toBe(true)
    await flushAllWrites()
    expect(hasPendingWrites()).toBe(false)
    expect((await readdir(dir)).sort()).toEqual(['a.json', 'b.json'])
  })
})
