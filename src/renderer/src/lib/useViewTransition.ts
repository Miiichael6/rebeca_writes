import { useEffect, useState } from 'react'
import { MOTION, motionDuration } from './motion'
import type { MountState } from './mountTransition'
import { useLatest } from './useLatest'

export interface ViewTransition<T> {
  /** Valor que hay que pintar ahora: durante la salida sigue siendo el anterior. */
  value: T
  state: MountState
}

/**
 * Cambio animado entre dos vistas que no conviven: la que se va termina su salida antes de
 * que entre la nueva. Devuelve qué valor pintar y en qué estado está la animación.
 *
 * Es el complemento de `useMountTransition`, que sirve para algo que aparece *sobre* lo que
 * ya hay; aquí uno sustituye al otro.
 */
export function useViewTransition<T>(value: T, duration: number = MOTION): ViewTransition<T> {
  const [shown, setShown] = useState<ViewTransition<T>>({ value, state: 'entered' })
  const shownRef = useLatest(shown)

  useEffect(() => {
    const current = shownRef.current
    if (current.value === value) return
    // Con `prefers-reduced-motion` la espera es 0 ms: el cambio se encadena igual, pero sin
    // que dé tiempo a ver ninguna animación.
    const wait = motionDuration(duration)
    setShown({ value: current.value, state: 'exiting' })
    let settle: ReturnType<typeof setTimeout>
    const swap = setTimeout(() => {
      setShown({ value, state: 'entering' })
      settle = setTimeout(() => setShown({ value, state: 'entered' }), wait)
    }, wait)
    return () => {
      clearTimeout(swap)
      clearTimeout(settle)
    }
  }, [value, duration, shownRef])

  return shown
}
