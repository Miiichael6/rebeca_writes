import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MicState } from '@shared/recording'
import { IpcChannel } from '@shared/ipc'
import { RecordHotkey } from '../../src/main/application/recordHotkey'
import type {
  HotkeyKeyEvent,
  HotkeySource,
  HotkeySourceListeners
} from '../../src/main/application/ports/hotkeySource'
import { DOUBLE_PRESS_MS, HOLD_START_MS } from '../../src/main/domain/hotkey/gesture'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const TAP_MS = 50

/** Teclado de mentira: el test pulsa y suelta la combinación a mano. */
class FakeSource implements HotkeySource {
  listeners: HotkeySourceListeners | null = null
  watch = vi.fn()
  dispose = vi.fn()
  listen(listeners: HotkeySourceListeners): void {
    this.listeners = listeners
  }
  key(event: HotkeyKeyEvent): void {
    this.listeners?.key(event)
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup() {
  const source = new FakeSource()
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
  const dock = { revealUntilStopped: vi.fn() }
  const publisher = { publish: vi.fn() }
  const hotkey = new RecordHotkey({
    source,
    mic,
    dock,
    recordingSource: () => 'voice',
    publisher,
    log
  })
  hotkey.configure('Ctrl+Super')
  return { hotkey, source, mic, dock, publisher }
}

/** Deja correr los temporizadores y las promesas que encadenan. */
const wait = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('RecordHotkey', () => {
  it('vigila la combinación guardada y deja de vigilar al desactivarla', () => {
    const { hotkey, source } = setup()
    expect(source.watch).toHaveBeenLastCalledWith({ modifiers: ['ctrl', 'win'], key: null })
    hotkey.configure(null)
    expect(source.watch).toHaveBeenLastCalledWith(null)
    hotkey.configure(null)
    expect(source.watch).toHaveBeenCalledTimes(2)
  })

  it('mantener graba, saca el dock y soltar para y guarda', async () => {
    const { source, mic, dock } = setup()
    source.key('down')
    await wait(HOLD_START_MS)
    expect(mic.start).toHaveBeenCalledWith('voice', expect.any(String))
    expect(dock.revealUntilStopped).toHaveBeenCalledOnce()
    source.key('up')
    await wait(0)
    expect(mic.stop).toHaveBeenCalledOnce()
  })

  it('un toque corto no graba', async () => {
    const { source, mic } = setup()
    source.key('down')
    await wait(TAP_MS)
    source.key('up')
    await wait(DOUBLE_PRESS_MS + HOLD_START_MS)
    expect(mic.start).not.toHaveBeenCalled()
  })

  it('doble pulsación graba en manos libres: soltar no para', async () => {
    const { source, mic } = setup()
    source.key('down')
    source.key('up')
    await wait(TAP_MS)
    source.key('down')
    await wait(0)
    expect(mic.start).toHaveBeenCalledOnce()
    await wait(HOLD_START_MS)
    source.key('up')
    await wait(0)
    expect(mic.stop).not.toHaveBeenCalled()
  })

  it('con otra tecla (Ctrl+Win+→) no hace nada', async () => {
    const { source, mic } = setup()
    source.key('down')
    source.key('other')
    await wait(HOLD_START_MS)
    source.key('up')
    expect(mic.start).not.toHaveBeenCalled()
  })

  it('si ya se está grabando, el atajo no hace nada', async () => {
    const { source, mic } = setup()
    await mic.start()
    mic.start.mockClear()
    source.key('down')
    await wait(HOLD_START_MS)
    source.key('up')
    await wait(0)
    expect(mic.start).not.toHaveBeenCalled()
    expect(mic.stop).not.toHaveBeenCalled()
  })

  it('nombra la entrada con la plantilla del renderer', async () => {
    const { hotkey, source, mic } = setup()
    hotkey.setNameTemplates({ voice: 'Voz {date}', system: 'Sistema {date}', both: 'Ambos {date}' })
    source.key('down')
    await wait(HOLD_START_MS)
    expect(mic.start).toHaveBeenCalledWith('voice', expect.stringMatching(/^Voz \d/))
  })

  it('en pausa (Configuración captura un atajo) no graba', async () => {
    const { hotkey, source, mic } = setup()
    hotkey.setPaused(true)
    source.key('down')
    await wait(HOLD_START_MS)
    expect(mic.start).not.toHaveBeenCalled()
  })

  it('publica los cambios de estado del atajo', () => {
    const { hotkey, source, publisher } = setup()
    source.listeners?.status('active')
    source.listeners?.status('active')
    expect(hotkey.status()).toBe('active')
    expect(publisher.publish).toHaveBeenCalledOnce()
    expect(publisher.publish).toHaveBeenCalledWith(IpcChannel.HotkeyStatusChanged, 'active')
  })
})
