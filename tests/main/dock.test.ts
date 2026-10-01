import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DockView } from '@shared/dock'
import type { MicState } from '@shared/recording'
import { Dock, HIDE_DELAY_MS, WATCH_MS } from '../../src/main/application/dock'
import type { DockSurface } from '../../src/main/application/ports/dockSurface'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

/** Superficie sin ventana: guarda la última vista y dice dónde está el ratón. */
class FakeSurface implements DockSurface {
  last: DockView | null = null
  cursor = true
  open = vi.fn()
  close = vi.fn()
  show(view: DockView): void {
    this.last = view
  }
  cursorInside(): boolean {
    return this.cursor
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup() {
  const surface = new FakeSurface()
  let state: MicState = { recording: false }
  const mic = {
    state: () => state,
    start: vi.fn(async () => {
      state = { recording: true, source: 'voice', startedAt: 0 }
      return { ok: true as const, state }
    }),
    stop: vi.fn(async () => {
      state = { recording: false }
    })
  }
  const quit = vi.fn()
  const menu = { open: false }
  const dock = new Dock({
    surface,
    mic,
    source: () => 'voice',
    menuOpen: () => menu.open,
    quit,
    log
  })
  return { dock, surface, mic, quit, menu }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Dock', () => {
  it('sale con el ratón y se esconde tras el retardo cuando se va', () => {
    const { dock, surface } = setup()
    dock.hover()
    expect(surface.last?.out).toBe(true)

    surface.cursor = false
    vi.advanceTimersByTime(HIDE_DELAY_MS - WATCH_MS)
    expect(surface.last?.out).toBe(true)
    vi.advanceTimersByTime(WATCH_MS)
    expect(surface.last?.out).toBe(false)
  })

  it('un pulso fuera del dock no lo esconde', () => {
    const { dock, surface } = setup()
    dock.hover()
    surface.cursor = false
    vi.advanceTimersByTime(WATCH_MS * 2)
    surface.cursor = true
    vi.advanceTimersByTime(HIDE_DELAY_MS * 2)
    expect(surface.last?.out).toBe(true)
  })

  it('no se esconde mientras su menú está abierto, y sí al cerrarlo', () => {
    const { dock, surface, menu } = setup()
    dock.hover()
    menu.open = true
    surface.cursor = false
    vi.advanceTimersByTime(HIDE_DELAY_MS * 3)
    expect(surface.last?.out).toBe(true)

    menu.open = false
    vi.advanceTimersByTime(HIDE_DELAY_MS)
    expect(surface.last?.out).toBe(false)
  })

  it('🎤 graba con la fuente elegida y luego ■ pregunta si terminar', async () => {
    const { dock, mic } = setup()
    expect(dock.view()).toMatchObject({ left: null, right: 'record' })

    await dock.press('right', 'Grabación')
    expect(mic.start).toHaveBeenCalledWith('voice', 'Grabación')
    expect(dock.view()).toMatchObject({ recording: true, left: 'askEnd', right: null })

    await dock.press('left', '')
    expect(dock.view()).toMatchObject({ out: true, question: 'end' })
  })

  it('"¿Terminar?" ✓ para y guarda; ✕ sigue grabando', async () => {
    const { dock, mic } = setup()
    await dock.press('right', 'Grabación')

    await dock.press('left', '')
    await dock.press('left', '')
    expect(mic.stop).not.toHaveBeenCalled()
    expect(dock.view()).toMatchObject({ recording: true, question: null })

    await dock.press('left', '')
    await dock.press('right', '')
    expect(mic.stop).toHaveBeenCalledOnce()
    expect(dock.view()).toMatchObject({ recording: false, question: null, out: false })
  })

  it('"¿Salir?" ✓ cierra la app; ✕ se queda', async () => {
    const { dock, quit } = setup()
    dock.askQuit()
    expect(dock.view().question).toBe('quit')

    await dock.press('left', '')
    expect(dock.view().question).toBeNull()
    expect(quit).not.toHaveBeenCalled()

    dock.askQuit()
    await dock.press('right', '')
    expect(quit).toHaveBeenCalledOnce()
  })

  it('una pregunta nueva sustituye a la anterior', async () => {
    const { dock } = setup()
    await dock.press('right', 'Grabación')
    await dock.press('left', '')
    expect(dock.view().question).toBe('end')

    dock.askQuit()
    expect(dock.view().question).toBe('quitRecording')
  })

  it('si la grabación para por otro lado, la pregunta de terminar desaparece', async () => {
    const { dock, mic } = setup()
    await dock.press('right', 'Grabación')
    await dock.press('left', '')
    await mic.stop()
    expect(dock.view()).toMatchObject({ question: null, right: 'record' })
  })

  it('sale mientras graba lo que empezó el atajo, y se esconde al terminar', async () => {
    const { dock, mic, surface } = setup()
    await dock.record('voice', 'Grabación')
    dock.revealUntilStopped()
    expect(surface.last?.out).toBe(true)
    await mic.stop()
    dock.refresh()
    expect(surface.last?.out).toBe(false)
    // Ya no recuerda la grabación anterior: la siguiente no lo saca sola.
    await dock.record('voice', 'Grabación')
    dock.refresh()
    expect(surface.last?.out).toBe(false)
  })

  it('avisa en el log si no puede grabar', async () => {
    const { dock, mic } = setup()
    mic.start.mockResolvedValueOnce({ ok: false, error: 'noDevice' } as never)
    await dock.record('system', 'Grabación')
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('noDevice'))
  })

  it('cerrarlo deja de vigilar el ratón y retira la pregunta', () => {
    const { dock, surface } = setup()
    dock.hover()
    dock.askQuit()
    dock.close()
    expect(surface.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(dock.view()).toMatchObject({ out: false, question: null })
  })
})
