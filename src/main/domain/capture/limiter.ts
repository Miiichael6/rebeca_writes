/**
 * Limitador suave para la suma de dos fuentes (tarea 29, de Rebecca Listen): por debajo del
 * codo las muestras pasan intactas; por encima se curvan (tanh) hacia el fondo de escala sin
 * pasarlo nunca. Sin estado, así que no puede dar chasquidos entre bloques.
 */

/** Nivel donde empieza la curva: unos −1,9 dBFS. */
const KNEE = 0.8
const HEADROOM = 1 - KNEE

export function softLimit(sample: number): number {
  const magnitude = Math.abs(sample)
  if (magnitude <= KNEE) return sample
  const bent = KNEE + HEADROOM * Math.tanh((magnitude - KNEE) / HEADROOM)
  return sample < 0 ? -bent : bent
}

/** Aplica `softLimit` a cada muestra, sobre el mismo array. */
export function softLimitInPlace(samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++) samples[i] = softLimit(samples[i])
}
