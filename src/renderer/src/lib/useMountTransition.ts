import { useEffect, useState } from 'react'
import { motionDuration } from './motion'
import { initialPhase, phaseChange, type MountPhase } from './mountTransition'
import { useLatest } from './useLatest'

/**
 * Mantiene un nodo montado mientras dura su animación de salida.
 *
 * Devuelve `mounted` (píntalo solo si es `true`) y `state`, que se usa como clase CSS
 * (`entering` / `entered` / `exiting`) para elegir la animación. Con
 * `prefers-reduced-motion: reduce` la espera es de 0 ms y el nodo aparece y desaparece en el
 * acto, sin pasar por los estados intermedios.
 */
export function useMountTransition(open: boolean, duration: number): MountPhase {
  const [phase, setPhase] = useState<MountPhase>(() => initialPhase(open))
  // El efecto necesita la fase vigente sin declararla como dependencia (se reejecutaría solo).
  const phaseRef = useLatest(phase)

  useEffect(() => {
    const wait = motionDuration(duration)
    const { next, settle } = phaseChange(phaseRef.current, open, wait > 0)
    setPhase(next)
    if (!settle) return
    const timer = setTimeout(() => setPhase(settle), wait)
    return () => clearTimeout(timer)
  }, [open, duration, phaseRef])

  return phase
}
