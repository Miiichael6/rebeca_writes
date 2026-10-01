import { describe, expect, it, vi } from 'vitest'
import type { QueueJob, QueueState } from '@shared/types'
import { QueueService, type QueueDeps } from '../../src/main/application/queueService'
import type { RunHooks, RunOutcome } from '../../src/main/application/ports/queueRunner'

const frozen = { model: 'small', language: 'es', translate: false }
const files = (...names: string[]): { filePath: string; fileName: string }[] =>
  names.map((fileName) => ({ filePath: `C:\\videos\\${fileName}`, fileName }))

/** Trabajo que termina cuando el test lo decide. */
interface Pending {
  job: QueueJob
  hooks: RunHooks
  finish: (outcome: RunOutcome) => void
}

function setup(options: { saved?: QueueJob[]; skip?: (job: QueueJob) => boolean } = {}): {
  queue: QueueService
  runs: Pending[]
  states: QueueState[]
  drained: ReturnType<typeof vi.fn>
  saved: () => QueueJob[]
  cancel: ReturnType<typeof vi.fn>
  names: () => string[]
  statuses: () => string[]
  next: () => Promise<Pending>
} {
  const runs: Pending[] = []
  const states: QueueState[] = []
  // Copia al guardar, como el escritor real al volcar a disco.
  let savedJobs: QueueJob[] = []
  const waiting: ((p: Pending) => void)[] = []
  const drained = vi.fn()
  const cancel = vi.fn()
  const deps: QueueDeps = {
    store: {
      load: async () => options.saved ?? [],
      save: (jobs) => (savedJobs = jobs().map((j) => ({ ...j })))
    },
    runner: {
      run: (job, hooks) =>
        new Promise((resolve) => {
          const pending = { job, hooks, finish: resolve }
          runs.push(pending)
          waiting.shift()?.(pending)
        }),
      cancel,
      waitIdle: async () => {},
      shouldSkip: async (job) => options.skip?.(job) ?? false
    },
    notifier: { onChange: (state) => states.push(state), onDrained: drained },
    now: () => 1000
  }
  const queue = new QueueService(deps)
  let taken = 0
  return {
    queue,
    runs,
    states,
    drained,
    cancel,
    saved: () => savedJobs,
    names: () => queue.state().jobs.map((j) => j.fileName),
    statuses: () => queue.state().jobs.map((j) => j.status),
    // El siguiente trabajo que la cola manda a transcribir.
    next: () => {
      const index = taken++
      if (runs[index]) return Promise.resolve(runs[index])
      return new Promise((resolve) => waiting.push(resolve))
    }
  }
}

describe('QueueService', () => {
  it('procesa los trabajos de uno en uno, en orden, y avisa al vaciarse', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4', 'c.mp4'), frozen)

    const a = await t.next()
    expect(a.job.fileName).toBe('a.mp4')
    expect(t.statuses()).toEqual(['processing', 'pending', 'pending'])
    expect(t.runs).toHaveLength(1)

    a.finish({ status: 'done' })
    const b = await t.next()
    expect(b.job.fileName).toBe('b.mp4')
    b.finish({ status: 'error', error: 'noAudioStream' })
    const c = await t.next()
    c.finish({ status: 'done' })
    await t.queue.idle()

    expect(t.statuses()).toEqual(['done', 'error', 'done'])
    expect(t.queue.state().jobs[1].error).toBe('noAudioStream')
    expect(t.drained).toHaveBeenCalledOnce()
    expect(t.drained).toHaveBeenCalledWith({ done: 2, errors: 1 })
  })

  it('congela modelo, idioma y traducción al encolar', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4'), { model: 'medium', language: 'auto', translate: true })
    const { job } = await t.next()
    expect(job).toMatchObject({ model: 'medium', language: 'auto', translate: true, addedAt: 1000 })
  })

  it('guarda la entrada del historial y el progreso del trabajo; el progreso no se persiste', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4'), frozen)
    const a = await t.next()
    a.hooks.onHistory('h1')
    a.hooks.onProgress(41.6)
    expect(t.queue.state().jobs[0]).toMatchObject({ historyId: 'h1', progress: 42 })
    expect(t.states.at(-1)?.jobs[0].progress).toBe(42)

    a.finish({ status: 'done' })
    await t.queue.idle()
    expect(t.queue.state().jobs[0].progress).toBeUndefined()
    expect(t.saved()[0]).toMatchObject({ status: 'done', historyId: 'h1' })
  })

  it('pausar deja terminar el trabajo en curso pero no toma el siguiente', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4'), frozen)
    const a = await t.next()
    t.queue.pause()
    a.finish({ status: 'done' })
    await t.queue.idle()

    expect(t.statuses()).toEqual(['done', 'pending'])
    expect(t.runs).toHaveLength(1)
    expect(t.drained).not.toHaveBeenCalled()

    t.queue.resume()
    ;(await t.next()).finish({ status: 'done' })
    await t.queue.idle()
    expect(t.statuses()).toEqual(['done', 'done'])
    expect(t.drained).toHaveBeenCalledWith({ done: 2, errors: 0 })
  })

  it('cancelar el actual lo marca cancelado y sigue con el siguiente', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4'), frozen)
    const a = await t.next()
    t.queue.cancelCurrent()
    expect(t.cancel).toHaveBeenCalledWith(a.job.id)
    a.finish({ status: 'cancelled' })

    const b = await t.next()
    expect(b.job.fileName).toBe('b.mp4')
    b.finish({ status: 'done' })
    await t.queue.idle()
    expect(t.statuses()).toEqual(['cancelled', 'done'])
  })

  it('salta los que ya tienen .srt sin transcribirlos', async () => {
    const t = setup({ skip: (job) => job.fileName === 'a.mp4' })
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4'), frozen)
    const b = await t.next()
    expect(b.job.fileName).toBe('b.mp4')
    b.finish({ status: 'done' })
    await t.queue.idle()

    expect(t.queue.state().jobs[0]).toMatchObject({ status: 'done', skipped: true })
    expect(t.runs).toHaveLength(1)
    expect(t.drained).toHaveBeenCalledWith({ done: 1, errors: 0 })
  })

  it('un fallo inesperado del runner cuenta como error y la cola sigue', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4'), frozen)
    const a = await t.next()
    // Simula que `run` rechaza.
    a.finish(Promise.reject(new Error('boom')) as unknown as RunOutcome)
    ;(await t.next()).finish({ status: 'done' })
    await t.queue.idle()
    expect(t.statuses()).toEqual(['error', 'done'])
    expect(t.queue.state().jobs[0].error).toBe('unknown')
  })

  it('reordena, quita y limpia completados sin tocar el trabajo en proceso', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4', 'c.mp4', 'd.mp4'), frozen)
    const a = await t.next()
    const [, b, c, d] = t.queue.state().jobs

    // Ids desconocidos se ignoran y los que faltan quedan al final.
    t.queue.reorder([d.id, 'nope', c.id])
    expect(t.names()).toEqual(['d.mp4', 'c.mp4', 'a.mp4', 'b.mp4'])

    t.queue.remove(a.job.id)
    expect(t.names()).toContain('a.mp4')
    t.queue.remove(b.id)
    expect(t.names()).toEqual(['d.mp4', 'c.mp4', 'a.mp4'])

    a.finish({ status: 'done' })
    const next = await t.next()
    expect(next.job.fileName).toBe('d.mp4')
    t.queue.clearCompleted()
    expect(t.names()).toEqual(['d.mp4', 'c.mp4'])
    expect(t.saved().map((j) => j.fileName)).toEqual(['d.mp4', 'c.mp4'])
  })

  it('al arrancar con pendientes espera a Retomar', async () => {
    const saved: QueueJob[] = [
      { id: '1', filePath: 'a.mp4', fileName: 'a.mp4', ...frozen, status: 'done', addedAt: 1 },
      { id: '2', filePath: 'b.mp4', fileName: 'b.mp4', ...frozen, status: 'pending', addedAt: 1 }
    ]
    const t = setup({ saved })
    await t.queue.init()
    expect(t.queue.state()).toMatchObject({ resumePending: true, paused: false })

    // Agregar más no arranca la cola mientras no se conteste.
    await t.queue.add(files('c.mp4'), frozen)
    await t.queue.idle()
    expect(t.runs).toHaveLength(0)

    t.queue.resume()
    expect((await t.next()).job.fileName).toBe('b.mp4')
    expect(t.queue.state().resumePending).toBe(false)
  })

  it('Descartar quita los pendientes de la sesión anterior', async () => {
    const saved: QueueJob[] = [
      { id: '1', filePath: 'a.mp4', fileName: 'a.mp4', ...frozen, status: 'done', addedAt: 1 },
      { id: '2', filePath: 'b.mp4', fileName: 'b.mp4', ...frozen, status: 'pending', addedAt: 1 }
    ]
    const t = setup({ saved })
    await t.queue.init()
    t.queue.discard()
    expect(t.queue.state()).toMatchObject({ resumePending: false })
    expect(t.names()).toEqual(['a.mp4'])
    expect(t.saved().map((j) => j.fileName)).toEqual(['a.mp4'])
  })

  it('Descartar conserva lo que se agregó mientras se esperaba la respuesta y lo procesa', async () => {
    const saved: QueueJob[] = [
      { id: '1', filePath: 'a.mp4', fileName: 'a.mp4', ...frozen, status: 'pending', addedAt: 1 }
    ]
    const t = setup({ saved })
    await t.queue.init()
    // "Abrir con" en el arranque: llega antes de que el usuario elija Retomar o Descartar.
    await t.queue.add(files('nuevo.mp4'), frozen)
    expect(t.runs).toHaveLength(0)
    t.queue.discard()
    expect(t.names()).toEqual(['nuevo.mp4'])
    expect((await t.next()).job.fileName).toBe('nuevo.mp4')
  })

  it('al cerrar la app deja de guardar: el trabajo en proceso queda como estaba', async () => {
    const t = setup()
    await t.queue.init()
    await t.queue.add(files('a.mp4', 'b.mp4'), frozen)
    const a = await t.next()
    t.queue.shutdown()
    a.finish({ status: 'cancelled' })
    await t.queue.idle()
    expect(t.saved().map((j) => j.status)).toEqual(['processing', 'pending'])
    expect(t.runs).toHaveLength(1)
  })
})
