/**
 * Grabar desde RebeccaWrites (tarea 29): lo que suena en el equipo, el micrófono o los dos
 * mezclados. Lo comparten el main (qué se abre) y el renderer (el menú de fuentes y los ajustes).
 */

export const RECORDING_SOURCES = ['system', 'voice', 'both'] as const
export type RecordingSource = (typeof RECORDING_SOURCES)[number]

export const DEFAULT_RECORDING_SOURCE: RecordingSource = 'voice'

/**
 * Estado de la grabación para el renderer. `startedAt` es la hora del main en ms;
 * `interrupted` dice que la última grabación se cortó sola (dispositivo perdido).
 */
export type MicState =
  | { recording: false; interrupted?: boolean }
  | { recording: true; source: RecordingSource; startedAt: number }

/** Un micrófono conectado, para elegirlo en el menú del botón de grabar. */
export interface MicDevice {
  id: string
  /** `Micrófono (Realtek(R) Audio)`. */
  name: string
  isDefault: boolean
}

/** Por qué no empezó: Listen está grabando, no hay dispositivo o falló otra cosa. */
export type MicStartError = 'liveBusy' | 'noDevice' | 'failed'

export type MicStartResult = { ok: true; state: MicState } | { ok: false; error: MicStartError }

/** Nivel (0..1) de un dispositivo en los medidores del menú: el sonido del sistema o el micrófono. */
export interface MonitorLevel {
  device: 'system' | 'voice'
  level: number
}

/** Los dispositivos que usa cada fuente: Computadora el sistema, Mi voz el micrófono, Ambos los dos. */
export function sourceDevices(source: RecordingSource): MonitorLevel['device'][] {
  switch (source) {
    case 'system':
      return ['system']
    case 'voice':
      return ['voice']
    case 'both':
      return ['system', 'voice']
  }
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** `AAAA-MM-DD HH-mm` en hora local: va en el nombre de la entrada y del MP3 (sin `:`). */
export function recordingStamp(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day} ${pad(date.getHours())}-${pad(date.getMinutes())}`
}

/** Hueco de la fecha en una plantilla de nombre. */
export const RECORDING_DATE_TOKEN = '{date}'

/**
 * Nombre de la entrada de cada fuente ya traducido, con `RECORDING_DATE_TOKEN` en lugar de la
 * fecha. El renderer se lo pasa al main para que el atajo (tarea 31) nombre sus grabaciones.
 */
export type RecordingNameTemplates = Record<RecordingSource, string>

/** El nombre de una grabación que empieza en `date` a partir de su plantilla. */
export function fillRecordingName(template: string, date: Date): string {
  return template.split(RECORDING_DATE_TOKEN).join(recordingStamp(date))
}
