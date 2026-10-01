import { callAppsIn } from '../domain/meeting/callApps'
import {
  NO_CALLS,
  nextSuggestion,
  type SuggestionInput,
  type SuggestionState
} from '../domain/meeting/meetingSuggestion'
import type { Dock } from './dock'
import type { MicRecording } from './micRecording'
import type { Logger } from './ports/eventPublisher'
import type { MicUsageSource } from './ports/micUsageSource'

export interface MeetingSuggesterDeps {
  source: MicUsageSource
  mic: Pick<MicRecording, 'state' | 'onStateChange'>
  dock: Pick<Dock, 'suggestMeeting' | 'withdrawMeeting'>
  log: Logger
}

/**
 * Sugerir grabar una reunión (tarea 32): cuando una app de llamadas coge el micrófono, el dock
 * pregunta si grabar. Une la vigilancia del micrófono, la lógica de `meetingSuggestion` y el
 * dock; solo vigila con el ajuste encendido.
 */
export class MeetingSuggester {
  private enabled = false
  private state: SuggestionState = NO_CALLS
  private wake: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly deps: MeetingSuggesterDeps) {
    deps.mic.onStateChange(() => this.feed({ type: 'recordingChanged' }))
  }

  /** Enciende o apaga la vigilancia (ajuste `suggestMeetingRecording`). */
  configure(enabled: boolean): void {
    if (enabled === this.enabled) return
    if (!enabled) return this.stop()
    this.enabled = true
    this.deps.source.start((apps) => this.feed({ type: 'micUsers', apps: callAppsIn(apps) }))
  }

  /** Al cerrar la app: no queda `rl-calls.exe` vivo. */
  dispose(): void {
    this.stop()
  }

  private stop(): void {
    this.enabled = false
    this.deps.source.stop()
    this.schedule(null)
    if (this.state.asking) this.deps.dock.withdrawMeeting()
    this.state = NO_CALLS
  }

  private feed(input: SuggestionInput): void {
    if (!this.enabled) return
    const recording = this.deps.mic.state().recording
    const step = nextSuggestion(this.state, input, Date.now(), recording)
    this.state = step.state
    this.schedule(step.wakeAt)
    if (step.action?.type === 'suggest') {
      this.deps.log.info(`Reuniones: empezó una llamada en ${step.action.app}`)
      this.deps.dock.suggestMeeting(() => this.feed({ type: 'answered' }))
    } else if (step.action?.type === 'withdraw') {
      this.deps.dock.withdrawMeeting()
    }
  }

  private schedule(wakeAt: number | null): void {
    if (this.wake) clearTimeout(this.wake)
    this.wake = null
    if (wakeAt === null) return
    this.wake = setTimeout(() => this.feed({ type: 'timer' }), Math.max(0, wakeAt - Date.now()))
  }
}
