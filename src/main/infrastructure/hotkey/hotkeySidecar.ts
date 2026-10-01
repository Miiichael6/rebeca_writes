import type { HotkeyStatus } from '@shared/shortcut'
import type { Logger } from '../../application/ports/eventPublisher'
import type { HotkeySource, HotkeySourceListeners } from '../../application/ports/hotkeySource'
import type { HotkeyCombo } from '../../domain/hotkey/accelerator'
import {
  hotkeyCommand,
  parseHotkeyEvent,
  type HotkeySidecarEvent
} from '../../domain/hotkey/hotkeyProtocol'
import { RestartingSidecar } from '../sidecar/restartingSidecar'

/** El sidecar en `resources/bin` (lo deja ahí `npm run build:native`). */
export const HOTKEY_BINARY = 'rl-hotkey.exe'

/**
 * Adaptador de `HotkeySource` sobre `rl-hotkey.exe` (tarea 31). El proceso vive mientras haya
 * algo que vigilar; si se cae lo vuelve a arrancar con la misma combinación.
 */
export class HotkeySidecar implements HotkeySource {
  private readonly process: RestartingSidecar
  private listeners: HotkeySourceListeners | null = null
  private combo: HotkeyCombo | null = null
  private disposed = false

  constructor(
    binaryPath: string,
    private readonly log: Logger
  ) {
    this.process = new RestartingSidecar(
      binaryPath,
      'Atajo',
      {
        line: (line) => this.handleLine(line),
        retry: () => {
          if (!this.disposed && this.combo) this.send()
        },
        gaveUp: () => this.fail()
      },
      log
    )
  }

  listen(listeners: HotkeySourceListeners): void {
    this.listeners = listeners
  }

  watch(combo: HotkeyCombo | null): void {
    this.combo = combo
    this.process.resetCrashes()
    if (this.disposed) return
    if (!combo && !this.process.isRunning()) return this.listeners?.status('off')
    this.send()
  }

  dispose(): void {
    this.disposed = true
    this.process.stop()
  }

  private send(): void {
    this.process.send(hotkeyCommand(this.combo))
  }

  private handleLine(line: string): void {
    const event = parseHotkeyEvent(line)
    if (!event) return this.log.warn(`Atajo: línea no válida del sidecar: ${line}`)
    this.handleEvent(event)
  }

  private handleEvent(event: HotkeySidecarEvent): void {
    switch (event.type) {
      case 'watching':
        return this.listeners?.status('active')
      case 'off':
        return this.listeners?.status('off')
      case 'error':
        return this.log.warn(`Atajo: el sidecar avisa ${event.code}: ${event.message}`)
      default:
        return this.listeners?.key(event.type)
    }
  }

  /** Se cayó demasiadas veces seguidas: el atajo queda roto hasta cambiarlo. */
  private fail(): void {
    const status: HotkeyStatus = this.combo ? 'failed' : 'off'
    this.listeners?.status(status)
  }
}
