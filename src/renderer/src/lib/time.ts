import { txtTimestamp } from '@shared/exporters'

const pad = (n: number): string => String(n).padStart(2, '0')

/** `mm:ss` para las marcas de la transcripción; `h:mm:ss` desde la primera hora. Igual que el .txt. */
export const formatTimestamp = txtTimestamp

/** `m:ss` para los tiempos del reproductor; `h:mm:ss` desde la primera hora. */
export function formatClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
