import { describe, expect, it, vi } from 'vitest'
import type { LiveDeps } from '../../src/main/application/liveSession'

const fakeSession = {
  pcm: 'C:\\rec\\a.pcm',
  recording: true,
  end: vi.fn(),
  cancel: vi.fn(),
  info: vi.fn()
}
let finishStart: () => void = () => {}

vi.mock('../../src/main/application/liveSession', () => ({
  LiveSession: {
    start: vi.fn(() => new Promise((resolve) => (finishStart = () => resolve(fakeSession))))
  }
}))

const { LiveSession } = await import('../../src/main/application/liveSession')
const { LiveBusyError, LiveControl } = await import('../../src/main/application/liveControl')

function setup(): {
  control: InstanceType<typeof LiveControl>
  deps: LiveDeps
  intake: { addPaths: ReturnType<typeof vi.fn> }
} {
  const deps = {
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    files: { remove: vi.fn(async () => {}) }
  } as unknown as LiveDeps
  const intake = { addPaths: vi.fn(async () => ({ added: 1, ignored: 0 })) }
  return { control: new LiveControl(deps, intake), deps, intake }
}

function session(pcm: string): typeof fakeSession {
  return { ...fakeSession, pcm, recording: true, end: vi.fn() }
}

describe('LiveControl', () => {
  it('un fin que llega mientras se crea la sesión espera y la cierra', async () => {
    const { control, deps, intake } = setup()

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

  it('mientras graba Listen se rechaza el micrófono, y al recibir su fin ya se puede', async () => {
    const { control } = setup()
    const listen = session('C:\\rec\\listen.pcm')
    const mic = session('C:\\tmp\\mic.pcm')
    vi.mocked(LiveSession.start)
      .mockResolvedValueOnce(listen as never)
      .mockResolvedValueOnce(mic as never)

    await control.handle({ kind: 'start', pcm: listen.pcm, name: 'Listen' })
    await expect(
      control.handle({ kind: 'start', pcm: mic.pcm, name: 'Mic' }, 'mic')
    ).rejects.toBeInstanceOf(LiveBusyError)
    expect(control.recordingOrigin()).toBe('listen')

    listen.recording = false
    await control.handle({ kind: 'start', pcm: mic.pcm, name: 'Mic' }, 'mic')
    expect(control.recordingOrigin()).toBe('mic')
  })

  it('el fin de una grabación de Listen rechazada manda el archivo a la cola', async () => {
    const { control, intake } = setup()
    const mic = session('C:\\tmp\\mic2.pcm')
    vi.mocked(LiveSession.start).mockResolvedValueOnce(mic as never)

    await control.handle({ kind: 'start', pcm: mic.pcm, name: 'Mic' }, 'mic')
    await expect(
      control.handle({ kind: 'start', pcm: 'C:\\rec\\b.pcm', name: 'b' })
    ).rejects.toBeInstanceOf(LiveBusyError)
    await control.handle({ kind: 'end', pcm: 'C:\\rec\\b.pcm', media: 'C:\\rec\\b.m4a' })

    expect(intake.addPaths).toHaveBeenCalledWith(['C:\\rec\\b.m4a'])
    expect(mic.end).not.toHaveBeenCalled()
  })
})
