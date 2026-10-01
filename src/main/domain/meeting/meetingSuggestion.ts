import type { RecordingSource } from '@shared/recording'

/**
 * Cuándo el dock pregunta si grabar una reunión (tarea 32, D11, D12): cuando una app de
 * llamadas empieza a usar el micrófono y no se está grabando. Cada llamada se pregunta una vez:
 * con ✓, ✕ o sin respuesta no se repite hasta que la app suelta el micrófono y lo vuelve a
 * coger. Sin temporizadores propios: devuelve `wakeAt` y quien la use manda `timer` a esa hora.
 */

/** ✓ graba el sistema (los demás) y el micrófono (uno mismo), D12. */
export const MEETING_SOURCE: RecordingSource = 'both'

/** Sin respuesta en este tiempo, la pregunta se retira. */
export const SUGGESTION_TIMEOUT_MS = 30_000
/**
 * La llamada termina si su app pasa este tiempo sin el micrófono: al cambiar de micrófono o
 * silenciarse, algunas lo sueltan un momento.
 */
export const CALL_END_GRACE_MS = 6000

/**
 * `micUsers`: las apps de llamadas que tienen el micrófono ahora. `recordingChanged`: empezó o
 * paró una grabación. `answered`: el usuario respondió (✓ o ✕). `timer`: llegó `wakeAt`.
 */
export type SuggestionInput =
  | { type: 'micUsers'; apps: readonly string[] }
  | { type: 'recordingChanged' }
  | { type: 'answered' }
  | { type: 'timer' }

export type SuggestionAction = { type: 'suggest'; app: string } | { type: 'withdraw' }

export interface SuggestionState {
  /**
   * Ya llegó la primera lectura. Esa solo marca la base: una app que ya tenía el micrófono al
   * arrancar (o un valor viejo que Windows dejó tras un cierre brusco) no es una llamada nueva.
   */
  primed: boolean
  /** App en llamada → `null` mientras tiene el micrófono, o la hora en que lo soltó. */
  calls: Readonly<Record<string, number | null>>
  /** La pregunta en pantalla, por la llamada de `app`, desde `at`. */
  asking: { app: string; at: number } | null
}

export const NO_CALLS: SuggestionState = { primed: false, calls: {}, asking: null }

export interface SuggestionStep {
  state: SuggestionState
  action: SuggestionAction | null
  /** Hora a la que mandar `timer`; `null` si no hace falta. */
  wakeAt: number | null
}

/** Las apps que siguen en llamada tras una lectura nueva (las que la soltaron, con margen). */
function updateCalls(
  calls: SuggestionState['calls'],
  apps: readonly string[],
  now: number
): Record<string, number | null> {
  const next: Record<string, number | null> = {}
  for (const [app, leftAt] of Object.entries(calls)) next[app] = leftAt ?? now
  for (const app of apps) next[app] = null
  return next
}

function withoutEnded(calls: Record<string, number | null>, now: number): void {
  for (const [app, leftAt] of Object.entries(calls))
    if (leftAt !== null && now - leftAt >= CALL_END_GRACE_MS) delete calls[app]
}

function mustWithdraw(
  asking: NonNullable<SuggestionState['asking']>,
  input: SuggestionInput,
  calls: SuggestionState['calls'],
  now: number,
  recording: boolean
): boolean {
  return (
    input.type === 'answered' ||
    recording ||
    !(asking.app in calls) ||
    now - asking.at >= SUGGESTION_TIMEOUT_MS
  )
}

function nextWake({ calls, asking }: SuggestionState): number | null {
  const times = Object.values(calls)
    .filter((leftAt): leftAt is number => leftAt !== null)
    .map((leftAt) => leftAt + CALL_END_GRACE_MS)
  if (asking) times.push(asking.at + SUGGESTION_TIMEOUT_MS)
  return times.length ? Math.min(...times) : null
}

/** `recording`: hay una grabación en curso (dock, atajo o app), así que no se pregunta. */
export function nextSuggestion(
  state: SuggestionState,
  input: SuggestionInput,
  now: number,
  recording: boolean
): SuggestionStep {
  const calls =
    input.type === 'micUsers' ? updateCalls(state.calls, input.apps, now) : { ...state.calls }
  withoutEnded(calls, now)

  let asking = state.asking
  let action: SuggestionAction | null = null
  if (asking && mustWithdraw(asking, input, calls, now, recording)) {
    asking = null
    // Quien respondió ya quitó la pregunta.
    if (input.type !== 'answered') action = { type: 'withdraw' }
  }
  if (input.type === 'micUsers' && state.primed && !asking && !recording) {
    const started = input.apps.find((app) => !(app in state.calls))
    if (started) {
      asking = { app: started, at: now }
      action = { type: 'suggest', app: started }
    }
  }

  const next = { primed: state.primed || input.type === 'micUsers', calls, asking }
  return { state: next, action, wakeAt: nextWake(next) }
}
