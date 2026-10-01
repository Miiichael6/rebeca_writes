/**
 * Qué gesto hace el usuario con el atajo de grabar (tarea 31, D10), a partir de cuándo se pulsa
 * y se suelta la combinación. Sin temporizadores propios: devuelve `wakeAt` y quien la use
 * manda `timer` a esa hora.
 */

/** Mantener la combinación más que esto empieza a grabar mientras siga pulsada. */
export const HOLD_START_MS = 400
/** Volver a pulsarla en este tiempo tras un toque corto deja grabando en manos libres. */
export const DOUBLE_PRESS_MS = 400

/**
 * `down`/`up`: la combinación queda completa o deja de estarlo. `other`: se pulsó otra tecla con
 * ella (p. ej. Ctrl+Win+→), así que no era el atajo. `timer`: llegó la hora pedida en `wakeAt`.
 */
export type HotkeyInput = 'down' | 'up' | 'other' | 'timer'

export type Gesture = 'startHold' | 'stopHold' | 'startLatched' | 'stopLatched'

export type GestureState =
  | { kind: 'idle' }
  /** Pulsada desde `at`, aún sin saber si es mantener o un toque. */
  | { kind: 'pressed'; at: number }
  | { kind: 'holding' }
  /** Toque corto soltado en `at`: espera la segunda pulsación. */
  | { kind: 'tapped'; at: number }
  /** Pulsada mientras graba en manos libres: al soltarla limpia, para. */
  | { kind: 'stopPress' }
  /** Ya decidido (manos libres u otra tecla): nada hasta soltar. */
  | { kind: 'waitRelease' }

export const IDLE: GestureState = { kind: 'idle' }

export interface GestureStep {
  state: GestureState
  gesture: Gesture | null
  /** Hora a la que mandar `timer`; `null` si no hace falta. */
  wakeAt: number | null
}

const step = (state: GestureState, gesture: Gesture | null = null): GestureStep => ({
  state,
  gesture,
  wakeAt: null
})

const pressedAt = (at: number): GestureStep => ({
  state: { kind: 'pressed', at },
  gesture: null,
  wakeAt: at + HOLD_START_MS
})

/** `latched`: hay una grabación en manos libres, así que pulsar el atajo la para. */
export function nextGesture(
  state: GestureState,
  input: HotkeyInput,
  now: number,
  latched = false
): GestureStep {
  switch (state.kind) {
    case 'idle':
      if (input !== 'down') return step(state)
      return latched ? step({ kind: 'stopPress' }) : pressedAt(now)

    // Para al soltar y no al pulsar: Ctrl+Win+→ no debe cortar la grabación.
    case 'stopPress':
      if (input === 'other') return step({ kind: 'waitRelease' })
      return input === 'up' ? step(IDLE, 'stopLatched') : step(state)

    case 'pressed':
      if (input === 'other') return step({ kind: 'waitRelease' })
      if (input === 'up')
        return { state: { kind: 'tapped', at: now }, gesture: null, wakeAt: now + DOUBLE_PRESS_MS }
      if (input === 'timer' && now >= state.at + HOLD_START_MS)
        return step({ kind: 'holding' }, 'startHold')
      return { state, gesture: null, wakeAt: state.at + HOLD_START_MS }

    case 'holding':
      return input === 'up' ? step(IDLE, 'stopHold') : step(state)

    case 'tapped': {
      const inTime = now - state.at <= DOUBLE_PRESS_MS
      if (input === 'down')
        return inTime ? step({ kind: 'waitRelease' }, 'startLatched') : pressedAt(now)
      if (input === 'other' || !inTime) return step(IDLE)
      return { state, gesture: null, wakeAt: state.at + DOUBLE_PRESS_MS }
    }

    case 'waitRelease':
      return input === 'up' ? step(IDLE) : step(state)
  }
}
