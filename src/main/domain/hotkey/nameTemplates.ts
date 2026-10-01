import {
  RECORDING_DATE_TOKEN,
  RECORDING_SOURCES,
  type RecordingNameTemplates
} from '@shared/recording'
import { isRecord } from '../guards'

/** Nombre largo de sobra; lo que pase de aquí no viene del renderer. */
const MAX_TEMPLATE_LENGTH = 200

/** Sin plantillas del renderer todavía: el nombre es solo la fecha. */
export const FALLBACK_NAME_TEMPLATE = RECORDING_DATE_TOKEN

/** Las plantillas que manda el renderer, o `null` si no traen una por fuente. */
export function toNameTemplates(input: unknown): RecordingNameTemplates | null {
  if (!isRecord(input)) return null
  const entries = RECORDING_SOURCES.map((source) => [source, input[source]] as const)
  const valid = entries.every(
    ([, template]) => typeof template === 'string' && template.length <= MAX_TEMPLATE_LENGTH
  )
  return valid ? (Object.fromEntries(entries) as RecordingNameTemplates) : null
}
