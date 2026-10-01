import { describe, expect, it, vi } from 'vitest'
import type { UpdateStatus } from '@shared/types'
import type { Updater, UpdaterEvents } from '../../src/main/application/ports/updater'
import { UpdateService } from '../../src/main/application/updateService'
import { installerSize, releaseNotesText } from '../../src/main/domain/updateInfo'

function fakeUpdater(available = true): Updater & { emit: UpdaterEvents } {
  const listeners: Partial<Record<keyof UpdaterEvents, (...args: never[]) => void>> = {}
  const emit = new Proxy({} as UpdaterEvents, {
    get:
      (_target, event: keyof UpdaterEvents) =>
      (...args: unknown[]) =>
        (listeners[event] as ((...a: unknown[]) => void) | undefined)?.(...args)
  })
  return {
    available,
    on: (event, listener) => void (listeners[event] = listener as never),
    check: vi.fn(async () => {}),
    download: vi.fn(async () => {}),
    quitAndInstall: vi.fn(),
    emit
  }
}

function service(
  updater: Updater,
  freeBytes = 10 ** 12,
  busy = { transcribing: false, cudaJob: false }
): { svc: UpdateService; published: UpdateStatus[] } {
  const published: UpdateStatus[] = []
  const svc = new UpdateService({
    updater,
    settings: { get: () => ({ autoCheckUpdates: true }) } as never,
    disk: { freeSpace: async () => freeBytes } as never,
    publisher: { publish: (_channel, payload) => void published.push(payload as UpdateStatus) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    dataDir: 'C:\\data',
    busy: () => busy
  })
  return { svc, published }
}

describe('UpdateService', () => {
  it('sin de dónde actualizar, comprobar deja "al día" sin llamar al actualizador', async () => {
    const updater = fakeUpdater(false)
    const { svc } = service(updater)
    expect((await svc.check()).state).toBe('upToDate')
    expect(updater.check).not.toHaveBeenCalled()
  })

  it('no descarga si falta espacio y avisa noDiskSpace', async () => {
    const updater = fakeUpdater()
    const { svc } = service(updater, 1024)
    updater.emit.available({ version: '2.0.0', sizeBytes: 50_000_000 })
    expect(await svc.download()).toEqual({ state: 'error', code: 'noDiskSpace' })
    expect(updater.download).not.toHaveBeenCalled()
  })

  it('descarga, queda lista y no instala mientras se transcribe', async () => {
    const updater = fakeUpdater()
    const { svc } = service(updater, 10 ** 12, { transcribing: true, cudaJob: false })
    updater.emit.available({ version: '2.0.0', sizeBytes: 1000 })
    await svc.download()
    expect(updater.download).toHaveBeenCalled()
    updater.emit.downloaded('2.0.0')
    expect(svc.install()).toEqual({ ok: false, reason: 'transcribing' })
    expect(updater.quitAndInstall).not.toHaveBeenCalled()
  })

  it('instala cuando está lista y nada lo impide', () => {
    const updater = fakeUpdater()
    const { svc } = service(updater)
    expect(svc.install()).toEqual({ ok: false, reason: 'notReady' })
    updater.emit.downloaded('2.0.0')
    expect(svc.install()).toEqual({ ok: true })
    expect(updater.quitAndInstall).toHaveBeenCalled()
  })

  it('traduce el error según la fase', async () => {
    const updater = fakeUpdater()
    const { svc } = service(updater)
    await svc.check()
    updater.emit.error(new Error('algo raro'))
    expect(svc.getStatus()).toEqual({ state: 'error', code: 'checkFailed' })
  })
})

describe('updateInfo', () => {
  it('quita las etiquetas HTML de las notas', () => {
    expect(releaseNotesText('<p>Hola&nbsp;<b>mundo</b></p>')).toBe('Hola mundo')
    expect(releaseNotesText([{ note: 'a' }, { note: 'b' }])).toBe('a\n\nb')
    expect(releaseNotesText(null)).toBeUndefined()
  })

  it('elige el instalador .exe entre los archivos', () => {
    expect(
      installerSize([
        { url: 'a.blockmap', size: 1 },
        { url: 'setup.EXE', size: 99 }
      ])
    ).toBe(99)
    expect(installerSize([])).toBe(0)
  })
})
