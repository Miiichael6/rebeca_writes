import { useEffect, useState } from 'react'
import { pushLevel, silentWave, WAVE_BARS } from '../domain/mic'

/**
 * Los últimos `bars` niveles de lo que se graba (el último a la derecha) mientras `active`;
 * vuelve a cero al dejar de grabar. Lo usan el botón de grabar y la píldora del dock.
 */
export function useWave(
  active: boolean,
  onLevel: (listener: (level: number) => void) => () => void,
  bars = WAVE_BARS
): number[] {
  const [wave, setWave] = useState(() => silentWave(bars))
  useEffect(() => {
    if (!active) return
    const off = onLevel((level) => setWave((w) => pushLevel(w, level)))
    return () => {
      off()
      setWave(silentWave(bars))
    }
  }, [active, onLevel, bars])
  return wave
}
