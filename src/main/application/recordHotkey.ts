import { IpcChannel } from '@shared/ipc'
import {
  fillRecordingName,
  type RecordingNameTemplates,
  type RecordingSource
} from '@shared/recording'
import type { HotkeyStatus } from '@shared/shortcut'
import { comboFor } from '../domain/hotkey/accelerator'
import { IDLE, nextGesture, type Gesture, type HotkeyInput } from '../domain/hotkey/gesture'
import { FALLBACK_NAME_TEMPLATE } from '../domain/hotkey/nameTemplates'
import type { Dock } from './dock'
import type { MicRecording } from './micRecording'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { HotkeySource } from './ports/hotkeySource'

export interface RecordHotkeyDeps {
  source: HotkeySource
  mic: Pick<MicRecording, 'state' | 'start' | 'stop'>
  dock: Pick<Dock, 'revealUntilStopped'>
  /** La fuente elegida en el botón de grabar. */
  recordingSource: () => RecordingSource
  publisher: EventPublisher
  log: Logger
}

/**
 * El atajo global para grabar (tarea 31, D10): mantenerlo graba hasta soltarlo; pulsarlo dos
 * veces graba en manos libres hasta el ■ del dock o hasta volver a pulsarlo.
 */
export class RecordHotkey {
  private gesture = IDLE
  private wake: ReturnType<typeof setTimeout> | null = null
  private current: HotkeyStatus = 'off'
  /** El atajo que se vigila; `undefined` hasta el primer `configure`. */
  private shortcut: string | null | undefined
  private templates: RecordingNameTemplates | null = null
  private paused = false
  /** La grabación en curso la empezó un "mantener": soltar la para. */
  private holdRecording = false

  constructor(private readonly deps: RecordHotkeyDeps) {
    deps.source.listen({
      key: (event) => this.feed(event),
      status: (status) => this.setStatus(status)
    })
  }

  /** El atajo guardado en Configuración; `null` lo desactiva. Vale al momento. */
  configure(shortcut: string | null): void {
    if (shortcut === this.shortcut) return
    this.shortcut = shortcut
    this.reset()
    this.deps.source.watch(comboFor(shortcut))
  }

  /** Los nombres de entrada traducidos por el renderer, con `{date}` donde va la fecha. */
  setNameTemplates(templates: RecordingNameTemplates): void {
    this.templates = templates
  }

  /** Mientras Configuración captura un atajo nuevo, pulsar el actual no graba. */
  setPaused(paused: boolean): void {
    this.paused = paused
    this.reset()
  }

  status(): HotkeyStatus {
    return this.current
  }

  dispose(): void {
    this.reset()
    this.deps.source.dispose()
  }

  private feed(input: HotkeyInput): void {
    if (this.paused) return
    const step = nextGesture(this.gesture, input, Date.now(), this.latchedRecording())
    this.gesture = step.state
    this.schedule(step.wakeAt)
    if (step.gesture) void this.act(step.gesture)
  }

  private schedule(wakeAt: number | null): void {
    if (this.wake) clearTimeout(this.wake)
    this.wake = null
    if (wakeAt === null) return
    this.wake = setTimeout(
      () => {
        this.wake = null
        this.feed('timer')
      },
      Math.max(0, wakeAt - Date.now())
    )
  }

  private async act(gesture: Gesture): Promise<void> {
    if (gesture === 'stopHold') {
      if (!this.holdRecording) return
      this.holdRecording = false
      return this.deps.mic.stop()
    }
    if (gesture === 'stopLatched') {
      if (!this.latchedRecording()) return
      return this.deps.mic.stop()
    }
    if (this.deps.mic.state().recording) return
    // Antes de esperar al arranque: soltar mientras arranca ya tiene que parar.
    this.holdRecording = gesture === 'startHold'
    const source = this.deps.recordingSource()
    const template = this.templates?.[source] ?? FALLBACK_NAME_TEMPLATE
    const result = await this.deps.mic.start(source, fillRecordingName(template, new Date()))
    if (!result.ok) {
      this.holdRecording = false
      return this.deps.log.warn(`Atajo: no se pudo empezar a grabar (${result.error})`)
    }
    this.deps.dock.revealUntilStopped()
  }

  /** Se graba y no por un "mantener" (doble pulsación, dock o botón): el atajo la para. */
  private latchedRecording(): boolean {
    return this.deps.mic.state().recording && !this.holdRecording
  }

  private reset(): void {
    this.gesture = IDLE
    this.schedule(null)
  }

  private setStatus(status: HotkeyStatus): void {
    if (status === this.current) return
    this.current = status
    this.deps.publisher.publish(IpcChannel.HotkeyStatusChanged, status)
  }
}
