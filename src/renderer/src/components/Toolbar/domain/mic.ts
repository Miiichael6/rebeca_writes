import type { RecordingSource } from '@shared/recording'
import { formatClock } from '@renderer/lib/time'

const pad = (n: number): string => String(n).padStart(2, '0')

/** `AAAA-MM-DD HH-mm` en hora local: va en el nombre de la entrada y del MP3 (sin `:`). */
export function recordingStamp(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day} ${pad(date.getHours())}-${pad(date.getMinutes())}`
}

/** Contador del botón mientras graba: `m:ss`, y `h:mm:ss` desde la primera hora. */
export function elapsedLabel(startedAt: number, now: number): string {
  return formatClock((now - startedAt) / 1000)
}

/** Botón de grabar: qué muestra y si se puede pulsar. */
export type MicButtonState =
  | { kind: 'idle'; disabled: boolean }
  | { kind: 'recording'; source: RecordingSource; startedAt: number }

/**
 * Mientras Rebecca Listen tiene una sesión en vivo no se puede grabar: solo hay una a la vez.
 * Una sesión en vivo sin grabación propia en curso es de Listen.
 */
export function micButtonState(
  mic: { recording: false } | { recording: true; source: RecordingSource; startedAt: number },
  liveSession: boolean,
  pending: boolean
): MicButtonState {
  if (mic.recording) return { kind: 'recording', source: mic.source, startedAt: mic.startedAt }
  return { kind: 'idle', disabled: pending || liveSession }
}
