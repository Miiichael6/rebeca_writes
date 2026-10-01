import type { MicDevice, RecordingSource } from '@shared/recording'
import { formatClock } from '@renderer/lib/time'

/** Contador del botón mientras graba: `m:ss`, y `h:mm:ss` desde la primera hora. */
export function elapsedLabel(startedAt: number, now: number): string {
  return formatClock((now - startedAt) / 1000)
}

/** Barras de la onda junto al contador. */
export const WAVE_BARS = 12

/** La onda en reposo: todas las barras a cero. */
export function silentWave(bars = WAVE_BARS): number[] {
  return new Array<number>(bars).fill(0)
}

/** La onda avanza: entra `level` por la derecha y sale la barra más vieja. */
export function pushLevel(wave: number[], level: number): number[] {
  return [...wave.slice(1), Math.max(0, Math.min(1, level))]
}

/** Computadora no usa el micrófono: solo Mi voz y Ambos muestran la lista de micrófonos. */
export function usesMicrophone(source: RecordingSource): boolean {
  return source !== 'system'
}

/**
 * El micrófono que se marca en el menú: el guardado si sigue conectado; si no, el predeterminado
 * (`''`), que es el que abre el main en ese caso.
 */
export function selectedMicId(micId: string, microphones: MicDevice[]): string {
  return microphones.some((d) => d.id === micId) ? micId : ''
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
