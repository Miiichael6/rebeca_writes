import { OWN_SPEAKER_ID, personNumber, type SpeakerNames } from '@shared/speakers'
import type { Segment } from '@shared/types'
import i18n from '@renderer/i18n'

/**
 * Nombre mostrado de un hablante (tarea 35): el que puso el usuario o el de por defecto en el
 * idioma de la interfaz ("Usted", "Persona 1").
 */
export function speakerName(id: string, custom: SpeakerNames | undefined): string {
  const named = custom?.[id]
  if (named) return named
  if (id === OWN_SPEAKER_ID) return i18n.t('speakers.you')
  return i18n.t('speakers.person', { n: personNumber(id) ?? id })
}

/** Los nombres mostrados de todos los hablantes de `segments`, para exportar y copiar. */
export function speakerNamesOf(
  segments: readonly Segment[],
  custom: SpeakerNames | undefined
): Record<string, string> {
  const names: Record<string, string> = {}
  for (const { speaker } of segments) {
    if (speaker !== undefined && !(speaker in names)) names[speaker] = speakerName(speaker, custom)
  }
  return names
}
