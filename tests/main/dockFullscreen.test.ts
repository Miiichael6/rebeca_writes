import { describe, expect, it, vi } from 'vitest'
import { DockFullscreen } from '../../src/main/application/dockFullscreen'
import type { FullscreenSource } from '../../src/main/application/ports/fullscreenSource'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup() {
  let changed: ((active: boolean) => void) | null = null
  const source: FullscreenSource = {
    start: vi.fn((listener) => {
      changed = listener
    }),
    stop: vi.fn(() => {
      changed = null
    })
  }
  const dock = { setFullscreen: vi.fn() }
  const watcher = new DockFullscreen({ source, dock, log })
  return { watcher, source, dock, emit: (active: boolean) => changed?.(active) }
}

describe('DockFullscreen', () => {
  it('no vigila hasta que se enciende el ajuste', () => {
    const { source } = setup()
    expect(source.start).not.toHaveBeenCalled()
  })

  it('pasa al dock lo que dice el sidecar', () => {
    const { watcher, dock, emit } = setup()
    watcher.configure(true)
    emit(true)
    expect(dock.setFullscreen).toHaveBeenLastCalledWith(true)
    emit(false)
    expect(dock.setFullscreen).toHaveBeenLastCalledWith(false)
  })

  it('al apagar el ajuste deja de vigilar y el dock vuelve', () => {
    const { watcher, source, dock, emit } = setup()
    watcher.configure(true)
    emit(true)
    watcher.configure(false)
    expect(source.stop).toHaveBeenCalled()
    expect(dock.setFullscreen).toHaveBeenLastCalledWith(false)
  })

  it('encenderlo dos veces no arranca otro sidecar', () => {
    const { watcher, source } = setup()
    watcher.configure(true)
    watcher.configure(true)
    expect(source.start).toHaveBeenCalledTimes(1)
  })
})
