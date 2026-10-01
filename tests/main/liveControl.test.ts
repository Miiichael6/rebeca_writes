import { describe, expect, it, vi } from 'vitest'
import type { LiveDeps } from '../../src/main/application/liveSession'

const fakeSession = { pcm: 'C:\\rec\\a.pcm', end: vi.fn(), cancel: vi.fn(), info: vi.fn() }
let finishStart: () => void = () => {}

vi.mock('../../src/main/application/liveSession', () => ({
  LiveSession: {
    start: vi.fn(() => new Promise((resolve) => (finishStart = () => resolve(fakeSession))))
  }
}))

const { LiveControl } = await import('../../src/main/application/liveControl')

describe('LiveControl', () => {
  it('un fin que llega mientras se crea la sesión espera y la cierra', async () => {
    const deps = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      files: { remove: vi.fn(async () => {}) }
    } as unknown as LiveDeps
    const intake = { addPaths: vi.fn(async () => ({ added: 1, ignored: 0 })) }
    const control = new LiveControl(deps, intake)

    const started = control.handle({ kind: 'start', pcm: fakeSession.pcm, name: 'a' })
    const ended = control.handle({ kind: 'end', pcm: fakeSession.pcm, media: 'C:\\rec\\a.m4a' })
    // El arranque empieza un microtick después: se suelta cuando `start` ya está esperando.
    await new Promise((resolve) => setImmediate(resolve))
    finishStart()
    await Promise.all([started, ended])

    expect(fakeSession.end).toHaveBeenCalledWith('C:\\rec\\a.m4a')
    expect(intake.addPaths).not.toHaveBeenCalled()
    expect(deps.files.remove).not.toHaveBeenCalled()
  })
})
