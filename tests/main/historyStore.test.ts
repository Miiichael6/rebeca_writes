import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HistoryStore, type NewHistoryEntry } from '../../src/main/services/historyStore'
import { QueueStore } from '../../src/main/services/queueStore'

let root: string
let dir: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'history-'))
  dir = join(root, 'history')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function input(fileName: string, createdAt?: number): NewHistoryEntry {
  return {
    filePath: join('C:\\videos', fileName),
    fileName,
    durationSec: 60,
    model: 'small',
    language: 'auto',
    ...(createdAt ? { createdAt } : {})
  }
}

const seg = (start: number, text: string): { start: number; end: number; text: string } => ({
  start,
  end: start + 1,
  text
})

describe('HistoryStore', () => {
  it('create escribe el índice al momento y list ordena del más nuevo al más viejo', async () => {
    const store = new HistoryStore({ dir })
    const a = await store.create(input('a.mp4', 1000))
    const b = await store.create(input('b.mp4', 2000))
    expect(a.status).toBe('pending')
    expect((await store.list()).map((e) => e.id)).toEqual([b.id, a.id])

    const index = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'))
    expect(index.entries).toHaveLength(2)
  })

  it('guarda segmentos incrementales y los recupera en otra instancia', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create(input('talk.mp4'))
    await store.update(id, { status: 'transcribing', progress: 40 })
    await store.appendSegments(id, [seg(0, 'Hola')])
    await store.appendSegments(id, [seg(1, 'mundo'), seg(2, '.')])
    await store.flush()

    const reopened = new HistoryStore({ dir })
    const loaded = await reopened.get(id)
    expect(loaded?.segments.map((s) => s.text)).toEqual(['Hola', 'mundo', '.'])
    // Una transcripción cortada vuelve a pending y el progreso no se guarda.
    expect(loaded?.entry.status).toBe('pending')
    expect(loaded?.entry.progress).toBeUndefined()
  })

  it('setSegments reemplaza y update cambia campos sin tocar el id', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create(input('x.mp4'))
    await store.appendSegments(id, [seg(0, 'viejo')])
    await store.setSegments(id, [{ ...seg(0, 'nuevo'), edited: true }])
    const updated = await store.update(id, {
      status: 'done',
      detectedLanguage: 'es',
      id: 'otro'
    } as never)
    expect(updated).toMatchObject({ id, status: 'done', detectedLanguage: 'es' })
    await store.flush()
    expect((await new HistoryStore({ dir }).get(id))?.segments).toEqual([
      { ...seg(0, 'nuevo'), edited: true }
    ])
  })

  it('updateSegment marca la edición, guarda el original y persiste', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create(input('x.mp4'))
    await store.appendSegments(id, [seg(0, 'hola'), seg(1, 'mundo')])
    expect(await store.updateSegment(id, 1, 'mundillo')).toEqual({
      ...seg(1, 'mundillo'),
      edited: true,
      originalText: 'mundo'
    })
    // Una segunda edición conserva el texto de whisper, no el de la primera.
    await store.updateSegment(id, 1, 'mundial')
    await store.flush()
    expect((await new HistoryStore({ dir }).get(id))?.segments).toEqual([
      seg(0, 'hola'),
      { ...seg(1, 'mundial'), edited: true, originalText: 'mundo' }
    ])
  })

  it('updateSegment con el texto original quita las marcas', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create(input('x.mp4'))
    await store.appendSegments(id, [seg(0, 'hola')])
    await store.updateSegment(id, 0, 'adiós')
    expect(await store.updateSegment(id, 0, 'hola')).toEqual(seg(0, 'hola'))
    expect(await store.updateSegment(id, 5, 'x')).toBeNull()
    expect(await store.updateSegment('nope', 0, 'x')).toBeNull()
  })

  it('ignora ids inexistentes', async () => {
    const store = new HistoryStore({ dir })
    expect(await store.update('nope', { status: 'done' })).toBeNull()
    await store.appendSegments('nope', [seg(0, 'x')])
    expect(await store.get('nope')).toBeNull()
    expect(await store.remove('nope')).toBe(false)
  })

  it('rechaza ids que podrían salir de la carpeta', async () => {
    const store = new HistoryStore({ dir })
    await expect(store.create({ ...input('a.mp4'), id: '..\\..\\evil' })).rejects.toThrow()
  })

  it('remove borra la entrada y su archivo de segmentos', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create(input('a.mp4'))
    await store.appendSegments(id, [seg(0, 'x')])
    await store.flush()
    expect(await store.remove(id)).toBe(true)
    expect(await readdir(dir)).toEqual(['index.json'])
    expect(await new HistoryStore({ dir }).list()).toEqual([])
  })

  it('clear solo borra dentro de la carpeta del historial', async () => {
    const media = join(root, 'video.mp4')
    const srt = join(root, 'video.srt')
    await writeFile(media, 'media')
    await writeFile(srt, 'srt')

    const store = new HistoryStore({ dir, debounceMs: 5 })
    const { id } = await store.create({ ...input('video.mp4'), filePath: media })
    await store.appendSegments(id, [seg(0, 'x')])
    await store.flush()
    await writeFile(join(dir, 'notas.txt'), 'no es nuestro')

    await store.clear()
    expect(await store.list()).toEqual([])
    expect(await readdir(dir)).toEqual(['notas.txt'])
    expect((await readdir(root)).sort()).toEqual(['history', 'video.mp4', 'video.srt'])
  })

  it('search busca en el texto sin mayúsculas ni tildes, también en disco', async () => {
    const store = new HistoryStore({ dir, debounceMs: 5 })
    const a = await store.create(input('a.mp4', 1000))
    const b = await store.create(input('b.mp4', 2000))
    await store.appendSegments(a.id, [seg(0, 'Hablamos de la CANCIÓN'), seg(1, 'y del ñandú')])
    await store.appendSegments(b.id, [seg(0, 'otra cosa')])
    await store.flush()

    const fresh = new HistoryStore({ dir })
    expect(await fresh.search('cancion')).toEqual([a.id])
    expect(await fresh.search('  Nandu ')).toEqual([a.id])
    expect(await fresh.search('cosa')).toEqual([b.id])
    expect(await fresh.search('nada')).toEqual([])
    expect(await fresh.search('   ')).toEqual([])
  })

  it('un index.json corrupto se respalda y el historial arranca vacío', async () => {
    const store = new HistoryStore({ dir })
    await store.create(input('a.mp4'))
    await writeFile(join(dir, 'index.json'), '{"entries": [')
    expect(await new HistoryStore({ dir }).list()).toEqual([])
    expect((await readdir(dir)).some((f) => f.startsWith('index.json.corrupt-'))).toBe(true)
  })
})

describe('QueueStore', () => {
  it('guarda y recupera la cola; el trabajo en proceso vuelve a pending', async () => {
    const path = join(root, 'queue.json')
    const store = new QueueStore({ path, debounceMs: 5 })
    const jobs = [
      { id: '1', filePath: 'a.mp4', fileName: 'a.mp4', model: 'small', language: 'auto' },
      { id: '2', filePath: 'b.mp4', fileName: 'b.mp4', model: 'small', language: 'es' }
    ].map((job) => ({ ...job, translate: false, addedAt: 1000 }))
    store.save(() => [
      { ...jobs[0], status: 'processing', progress: 50 },
      { ...jobs[1], status: 'pending' }
    ])
    await store.flush()

    expect(await new QueueStore({ path }).load()).toEqual([
      { ...jobs[0], status: 'pending' },
      { ...jobs[1], status: 'pending' }
    ])
  })

  it('sin archivo la cola está vacía', async () => {
    expect(await new QueueStore({ path: join(root, 'queue.json') }).load()).toEqual([])
  })
})
