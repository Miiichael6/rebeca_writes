/**
 * Máquina de estados de una aparición/desaparición animada, sin React ni temporizadores:
 * dado el estado actual y si el elemento debe estar abierto, dice qué estado toca ahora y
 * cuál hay que aplicar cuando termine la animación. El hook `useMountTransition` es quien
 * pone los `setTimeout`.
 */

export type MountState = 'entering' | 'entered' | 'exiting'

export interface MountPhase {
  /** Si el nodo tiene que estar en el DOM (sigue montado mientras dura la salida). */
  mounted: boolean
  state: MountState
}

/** Un elemento cerrado no está en el DOM; su `state` da igual, pero conviene que sea estable. */
export const CLOSED: MountPhase = { mounted: false, state: 'exiting' }
export const OPENED: MountPhase = { mounted: true, state: 'entered' }

export interface PhaseChange {
  /** Estado que se aplica ya. */
  next: MountPhase
  /** Estado que se aplica al acabar la animación, o `null` si no hay nada que esperar. */
  settle: MountPhase | null
}

/** Estado con el que arranca el hook: lo que ya está abierto no anima su entrada. */
export function initialPhase(open: boolean): MountPhase {
  return open ? OPENED : CLOSED
}

/**
 * Transición a aplicar cuando cambia `open`. Con `animate: false` (sistema con menos
 * movimiento) no hay estados intermedios: se monta o se desmonta en el acto.
 */
export function phaseChange(current: MountPhase, open: boolean, animate: boolean): PhaseChange {
  if (!animate) return { next: open ? OPENED : CLOSED, settle: null }
  if (open) {
    // Reabrir mientras salía: vuelve a entrar desde donde esté, no desde cero.
    if (current.mounted && current.state === 'entered') return { next: OPENED, settle: null }
    return { next: { mounted: true, state: 'entering' }, settle: OPENED }
  }
  // Cerrar algo que nunca llegó a montarse no tiene salida que animar.
  if (!current.mounted) return { next: CLOSED, settle: null }
  return { next: { mounted: true, state: 'exiting' }, settle: CLOSED }
}
