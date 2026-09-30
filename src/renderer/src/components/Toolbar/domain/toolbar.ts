import type { TranscriptStatus } from '@shared/types'

/** Valor especial del combo de modelos: no es un modelo, abre Configuración. */
export const MORE_MODELS = '__more__'

/** Por qué no se puede transcribir el archivo abierto (ver `startBlocker`). */
export type Blocker = 'noMedia' | 'busy' | null

export interface Option {
  value: string
  label: string
}

/**
 * Si el modelo elegido no está descargado (o se borró), el primero que sí lo esté. `null` si no
 * hay que cambiar nada: la lista aún no cargó, no hay ninguno descargado o el elegido sirve.
 */
export function fallbackModel(
  loaded: boolean,
  downloaded: readonly { id: string }[],
  current: string
): string | null {
  if (!loaded || downloaded.length === 0) return null
  return downloaded.some((m) => m.id === current) ? null : downloaded[0].id
}

export function hasModel(downloaded: readonly { id: string }[], current: string): boolean {
  return downloaded.some((m) => m.id === current)
}

/** Opciones del combo de modelos: los descargados y, al final, «más modelos». */
export function modelOptions(
  downloaded: readonly { id: string; label: string }[],
  modelIsAvailable: boolean,
  labels: { noModels: string; moreModels: string }
): Option[] {
  return [
    ...(modelIsAvailable ? [] : [{ value: '', label: labels.noModels }]),
    ...downloaded.map((m) => ({ value: m.id, label: m.label })),
    { value: MORE_MODELS, label: labels.moreModels }
  ]
}

/** El modelo y el idioma no cambian a mitad de la transcripción del archivo abierto. */
export function isLocked(status: TranscriptStatus): boolean {
  return status === 'transcribing'
}

export type ActionButton =
  { kind: 'cancel' } | { kind: 'transcribe'; disabled: boolean; retranscribe: boolean } | null

/** Botón principal de la barra: cancelar mientras corre, transcribir o volver a transcribir. */
export function actionButton(
  status: TranscriptStatus,
  blocker: Blocker,
  modelIsAvailable: boolean
): ActionButton {
  if (status === 'transcribing') return { kind: 'cancel' }
  if (status === 'ready' || status === 'error' || status === 'done') {
    return {
      kind: 'transcribe',
      disabled: blocker !== null || !modelIsAvailable,
      retranscribe: status === 'done'
    }
  }
  return null
}

/** Volver a transcribir reemplaza los segmentos: si hay ediciones, se pide confirmación. */
export function needsRestartConfirm(segments: readonly { edited?: boolean }[]): boolean {
  return segments.some((s) => s.edited)
}
