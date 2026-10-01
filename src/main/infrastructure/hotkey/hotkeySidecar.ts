import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import type { HotkeyStatus } from '@shared/shortcut'
import type { Logger } from '../../application/ports/eventPublisher'
import type { HotkeySource, HotkeySourceListeners } from '../../application/ports/hotkeySource'
import type { HotkeyCombo } from '../../domain/hotkey/accelerator'
import { LineReader } from '../../domain/capture/sidecarProtocol'
import {
  hotkeyCommand,
  parseHotkeyEvent,
  type HotkeySidecarEvent
} from '../../domain/hotkey/hotkeyProtocol'

/** El sidecar en `resources/bin` (lo deja ahí `npm run build:native`). */
export const HOTKEY_BINARY = 'rl-hotkey.exe'
/** Espera antes de volver a arrancarlo si se cae. */
const RESTART_DELAY_MS = 1000
/** Caídas seguidas antes de rendirse y dar el atajo por roto. */
const MAX_RESTARTS = 3
/** Si vivió al menos esto, la caída no cuenta como seguida. */
const STABLE_MS = 60_000

/**
 * Adaptador de `HotkeySource` sobre `rl-hotkey.exe` (tarea 31). El proceso vive mientras haya
 * algo que vigilar; si se cae lo vuelve a arrancar con la misma combinación.
 */
export class HotkeySidecar implements HotkeySource {
  private child: ChildProcessWithoutNullStreams | null = null
  private listeners: HotkeySourceListeners | null = null
  private combo: HotkeyCombo | null = null
  private startedAt = 0
  private crashes = 0
  private restart: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  constructor(
    private readonly binaryPath: string,
    private readonly log: Logger
  ) {}

  listen(listeners: HotkeySourceListeners): void {
    this.listeners = listeners
  }

  watch(combo: HotkeyCombo | null): void {
    this.combo = combo
    this.crashes = 0
    if (this.disposed) return
    if (!combo && !this.child) return this.listeners?.status('off')
    this.send()
  }

  dispose(): void {
    this.disposed = true
    if (this.restart) clearTimeout(this.restart)
    // Cerrar stdin hace que el sidecar termine solo.
    this.child?.stdin.end()
    this.child = null
  }

  private send(): void {
    const child = this.child ?? this.start()
    child.stdin.write(`${JSON.stringify(hotkeyCommand(this.combo))}\n`)
  }

  private start(): ChildProcessWithoutNullStreams {
    const child = spawn(this.binaryPath, [], { windowsHide: true })
    this.startedAt = Date.now()
    this.log.info(`Atajo: sidecar arrancado (${this.binaryPath})`)

    const lines = new LineReader((line) => this.handleLine(line))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => lines.push(chunk))
    child.on('error', (error) => this.handleEnd(child, error.message))
    child.on('exit', (code) => this.handleEnd(child, `código de salida ${code}`))
    child.stdin.on('error', (error) => this.handleEnd(child, error.message))

    this.child = child
    return child
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

  private handleEnd(child: ChildProcessWithoutNullStreams, reason: string): void {
    // `error` y `exit` pueden llegar los dos para el mismo proceso.
    if (this.child !== child) return
    this.child = null
    if (this.disposed) return
    this.log.warn(`Atajo: el sidecar terminó (${reason})`)
    this.crashes = Date.now() - this.startedAt >= STABLE_MS ? 1 : this.crashes + 1
    if (this.crashes > MAX_RESTARTS) return this.fail()
    this.restart = setTimeout(() => {
      this.restart = null
      if (!this.disposed && this.combo) this.send()
    }, RESTART_DELAY_MS)
  }

  private fail(): void {
    this.log.error(
      `Atajo: el sidecar se cayó ${MAX_RESTARTS + 1} veces seguidas; queda desactivado`
    )
    const status: HotkeyStatus = this.combo ? 'failed' : 'off'
    this.listeners?.status(status)
  }
}
