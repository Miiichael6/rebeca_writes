import { useEffect, useRef, useState } from 'react'
import { MOTION, motionDuration } from './motion'
import { extendRecent, isRecent, NO_RECENT, type RecentWindow } from './recentItems'

/** Más altas de golpe que esto no son transcripción en vivo, sino una lista que se carga entera. */
const MAX_BURST = 40

/**
 * Dice qué índices de una lista que crece acaban de llegar, para animar solo esos. Pensado
 * para la transcripción en vivo, donde los segmentos van apareciendo al final mientras el
 * virtualizador recicla el resto de filas al desplazarse.
 */
export function useRecentItems(
  count: number,
  duration: number = MOTION
): (index: number) => boolean {
  const [recent, setRecent] = useState<RecentWindow>(NO_RECENT)
  // Cuántos elementos había en el render anterior. Se escribe solo dentro del efecto.
  const previous = useRef(count)

  useEffect(() => {
    const before = previous.current
    if (count === before) return
    previous.current = count
    const wait = motionDuration(duration)
    const next = extendRecent(recent, before, count, Date.now(), wait, MAX_BURST)
    setRecent(wait === 0 ? NO_RECENT : next)
  }, [count, duration, recent])

  // Al caducar la ventana se olvida, para que las filas recicladas por el virtualizador no
  // vuelvan a animarse al pasar por esos índices.
  useEffect(() => {
    if (recent === NO_RECENT) return
    const timer = setTimeout(() => setRecent(NO_RECENT), Math.max(0, recent.expires - Date.now()))
    return () => clearTimeout(timer)
  }, [recent])

  return (index) => isRecent(recent, index)
}
