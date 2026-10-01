import { describe, expect, it } from 'vitest'
import { PreviewQueue } from '../../src/main/application/previewQueue'
import type { PreviewEncoder } from '../../src/main/application/ports/previewEncoder'
import type { PreviewCacheEvents } from '../../src/main/application/ports/previewGenerator'
import type { PreviewStore } from '../../src/main/application/ports/previewStore'
import {
  audioEncoders,
  isLeftover,
  isPartial,
  type CacheFile,
  type PreviewPlan
} from '../../src/main/domain/previewPlan'

const DIR = '/cache/'
const VIDEO_ORIGINAL_AUDIO: PreviewPlan = { audioOnly: false, audio: 'original' }
const VIDEO_ENCODE_AUDIO: PreviewPlan = { audioOnly: false, audio: 'encode' }
const AUDIO_ONLY_COPY: PreviewPlan = { audioOnly: true, audio: 'copy' }

/** Carpeta en memoria. La clave de un medio es su nombre; el uso avanza con un reloj. */
class MemoryStore implements PreviewStore {
  readonly files = new Map<string, Omit<CacheFile, 'name'>>()
  private clock = 0

  constructor(initial: Record<string, number> = {}) {
    for (const [name, size] of Object.entries(initial)) this.write(name, size)
  }

  write(name: string, size = 100): void {
    this.files.set(name, { size, mtimeMs: ++this.clock })
  }

  names(): string[] {
    return [...this.files.keys()].sort()
  }

  async prepare(): Promise<void> {
    for (const name of this.files.keys()) if (isLeftover(name)) this.files.delete(name)
  }
  async keyFor(input: string): Promise<string> {
    return input
  }
  pathOf(name: string): string {
    return DIR + name
  }
  async touch(name: string): Promise<boolean> {
    const file = this.files.get(name)
    if (file) file.mtimeMs = ++this.clock
    return file !== undefined
  }
  async commit(part: string, name: string): Promise<void> {
    const file = this.files.get(part)
    if (!file) throw new Error(`no existe ${part}`)
    this.files.delete(part)
    this.files.set(name, file)
  }
  async remove(name: string): Promise<void> {
    this.files.delete(name)
  }
  async list(): Promise<CacheFile[]> {
    return [...this.files].filter(([name]) => !isPartial(name)).map(([name, f]) => ({ name, ...f }))
  }
  async totalSize(): Promise<number> {
    return [...this.files.values()].reduce((sum, f) => sum + f.size, 0)
  }
  async removeAll(): Promise<void> {
    this.files.clear()
  }
}

/** Un ffmpeg en marcha que el test termina, hace fallar o hace avanzar a mano. */
interface Run {
  input: string
  /** Nombre del `.part` que escribe. */
  part: string
  args: string[]
  signal: AbortSignal
  progress: (percent: number) => void
  finish: () => void
  fail: (message?: string) => void
}

/** Encoder falso: escribe el `.part` en el store al terminar bien y se cancela con `signal`. */
class FakeEncoder implements PreviewEncoder {
  private readonly waiting: ((run: Run) => void)[] = []
  private readonly started: Run[] = []
  count = 0

  constructor(private readonly store: MemoryStore) {}

  run(
    args: string[],
    _durationSec: number,
    onProgress: (percent: number) => void,
    signal: AbortSignal
  ): Promise<void> {
    this.count++
    return new Promise((resolve, reject) => {
      const part = args.at(-1)!.slice(DIR.length)
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      const run: Run = {
        input: args[args.indexOf('-i') + 1],
        part,
        args,
        signal,
        progress: onProgress,
        finish: () => {
          this.store.write(part)
          resolve()
        },
        fail: (message = 'ffmpeg falló') => reject(new Error(message))
      }
      const waiter = this.waiting.shift()
      if (waiter) waiter(run)
      else this.started.push(run)
    })
  }

  /** El siguiente ffmpeg que arranque (o el que ya arrancó y nadie recogió). */
  next(): Promise<Run> {
    const run = this.started.shift()
    if (run) return Promise.resolve(run)
    return new Promise((resolve) => this.waiting.push(resolve))
  }
}

function setup(options: { files?: Record<string, number>; maxBytes?: number } = {}): {
  queue: PreviewQueue
  store: MemoryStore
  encoder: FakeEncoder
} {
  const store = new MemoryStore(options.files)
  const encoder = new FakeEncoder(store)
  const maxBytes = options.maxBytes ?? 1e9
  const queue = new PreviewQueue({ store, encoder, maxBytes: () => maxBytes })
  return { queue, store, encoder }
}

function nextEvent<K extends keyof PreviewCacheEvents>(
  queue: PreviewQueue,
  event: K
): Promise<PreviewCacheEvents[K]> {
  return new Promise((resolve) =>
    queue.once(event, ((...args: PreviewCacheEvents[K]) => resolve(args)) as never)
  )
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('PreviewQueue', () => {
  it('saca primero el audio provisional y luego la vista previa', async () => {
    const { queue, store, encoder } = setup()
    const audio = nextEvent(queue, 'audio')
    const requested = queue.request('a.mkv', VIDEO_ENCODE_AUDIO, 10)

    const audioRun = await encoder.next()
    expect(audioRun.args).not.toContain('libx264')
    audioRun.finish()
    expect(await audio).toEqual(['a.mkv', DIR + 'a.mkv.tmp-audio.m4a'])
    await requested

    const videoRun = await encoder.next()
    expect(videoRun.args).toContain('libx264')
    videoRun.progress(40)
    expect(await queue.lookup('a.mkv', VIDEO_ENCODE_AUDIO)).toEqual({
      pending: { audioPath: DIR + 'a.mkv.tmp-audio.m4a', percent: 40 }
    })

    const ready = nextEvent(queue, 'ready')
    videoRun.finish()
    expect(await ready).toEqual(['a.mkv', DIR + 'a.mkv.mp4'])
    expect(await queue.lookup('a.mkv', VIDEO_ENCODE_AUDIO)).toEqual({ path: DIR + 'a.mkv.mp4' })
    expect(store.names()).toEqual(['a.mkv.mp4', 'a.mkv.tmp-audio.m4a'])
  })

  it('sin audio provisional sigue con el video', async () => {
    const { queue, encoder } = setup()
    const requested = queue.request('a.mkv', VIDEO_ENCODE_AUDIO, 10)
    for (let i = 0; i < audioEncoders(false).length; i++) (await encoder.next()).fail()
    await requested

    const videoRun = await encoder.next()
    expect(videoRun.args).toContain('libx264')
    expect(await queue.lookup('a.mkv', VIDEO_ENCODE_AUDIO)).toEqual({
      pending: { audioPath: null, percent: 0 }
    })
  })

  it('genera de una en una y la última pedida va primero; repetir la adelanta', async () => {
    const { queue, encoder } = setup()
    for (const input of ['a.mkv', 'b.mkv', 'c.mkv', 'd.mkv']) {
      await queue.request(input, VIDEO_ORIGINAL_AUDIO, 10)
    }
    // Volver a pedir algo en cola lo pasa delante sin arrancar otra generación.
    await queue.request('b.mkv', VIDEO_ORIGINAL_AUDIO, 10)

    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      const run = await encoder.next()
      order.push(run.input)
      run.finish()
    }
    expect(order).toEqual(['a.mkv', 'b.mkv', 'd.mkv', 'c.mkv'])
    expect(encoder.count).toBe(4)
  })

  it('prueba el siguiente codificador de audio si uno falla', async () => {
    const { queue, store, encoder } = setup()
    const ready = nextEvent(queue, 'ready')
    await queue.request('song.wma', AUDIO_ONLY_COPY, 10)

    const encoders = audioEncoders(true)
    for (const [i, encoder_] of encoders.entries()) {
      const run = await encoder.next()
      expect(run.args.join(' ')).toContain(`-c:a ${encoder_}`)
      if (i < encoders.length - 1) run.fail()
      else run.finish()
    }
    expect(await ready).toEqual(['song.wma', DIR + 'song.wma.m4a'])
    expect(store.names()).toEqual(['song.wma.m4a'])
  })

  it('avisa si no se puede generar y no deja nada a medias', async () => {
    const { queue, store, encoder } = setup()
    const failed = nextEvent(queue, 'failed')
    await queue.request('a.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    const run = await encoder.next()
    store.write(run.part)
    run.fail('códec roto')

    const [input, error] = await failed
    expect(input).toBe('a.mkv')
    expect(error.message).toBe('códec roto')
    expect(store.names()).toEqual([])
    // El trabajo se olvida: se puede volver a pedir.
    expect(await queue.lookup('a.mkv', VIDEO_ORIGINAL_AUDIO)).toBeNull()
  })

  it('clear() cancela lo que se genera, no emite nada y vacía la carpeta', async () => {
    const { queue, store, encoder } = setup({ files: { 'old.mp4': 100 } })
    const events: string[] = []
    queue.on('ready', () => events.push('ready')).on('failed', () => events.push('failed'))
    await queue.request('a.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    await queue.request('b.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    const run = await encoder.next()

    await queue.clear()
    expect(run.signal.aborted).toBe(true)
    expect(store.names()).toEqual([])
    await tick()
    expect(events).toEqual([])
    // Lo que estaba en cola también se descarta.
    expect(encoder.count).toBe(1)

    // Después se puede volver a pedir.
    await queue.request('a.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    expect((await encoder.next()).input).toBe('a.mkv')
  })

  it('clear() durante el audio provisional no encola el video', async () => {
    const { queue, encoder } = setup()
    const requested = queue.request('a.mkv', VIDEO_ENCODE_AUDIO, 10)
    await encoder.next()
    await queue.clear()
    await requested
    await tick()
    expect(encoder.count).toBe(1)
  })

  it('al pasarse del límite borra lo menos usado y conserva el audio de lo que está en curso', async () => {
    const { queue, store, encoder } = setup({
      files: { 'old.mp4': 100, 'mid.mp4': 100 },
      maxBytes: 250
    })
    // a: audio provisional y video en marcha.
    const requestedA = queue.request('a.mkv', VIDEO_ENCODE_AUDIO, 10)
    ;(await encoder.next()).finish()
    await requestedA
    const videoA = await encoder.next()
    // c: su audio provisional suena mientras espera turno.
    const requestedC = queue.request('c.mkv', VIDEO_ENCODE_AUDIO, 10)
    ;(await encoder.next()).finish()
    await requestedC

    // Lo que hay al avisar: justo después arranca c y ya no se necesita el audio de a.
    const atReady = new Promise<string[]>((resolve) =>
      queue.once('ready', () => resolve(store.names()))
    )
    videoA.finish()
    expect(await atReady).toEqual(['a.mkv.mp4', 'a.mkv.tmp-audio.m4a', 'c.mkv.tmp-audio.m4a'])
  })

  it('una nueva generación borra el audio provisional que ya nadie usa', async () => {
    const { queue, store, encoder } = setup()
    await queue.size()
    // Audio provisional de una generación que ya terminó.
    store.write('z.mkv.tmp-audio.m4a')
    await queue.request('a.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    await encoder.next()
    expect(store.names()).toEqual([])
  })

  it('al arrancar borra lo que quedó a medias', async () => {
    const { queue, store } = setup({
      files: { 'a.mp4.part': 1, 'b.tmp-audio.m4a': 1, 'c.mp4': 10 }
    })
    expect(await queue.size()).toBe(10)
    expect(store.names()).toEqual(['c.mp4'])
  })

  it('dispose() mata la generación en curso', async () => {
    const { queue, encoder } = setup()
    await queue.request('a.mkv', VIDEO_ORIGINAL_AUDIO, 10)
    const run = await encoder.next()
    queue.dispose()
    expect(run.signal.aborted).toBe(true)
  })
})
