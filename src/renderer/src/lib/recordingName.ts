import {
  RECORDING_DATE_TOKEN,
  RECORDING_SOURCES,
  recordingStamp,
  type RecordingNameTemplates,
  type RecordingSource
} from '@shared/recording'
import i18n from '@renderer/i18n'

/** Nombre traducido de la entrada de `source` con `date` como fecha. */
function entryName(source: RecordingSource, date: string): string {
  return i18n.t('mic.entryName', { date, source: i18n.t(`mic.sources.${source}`) })
}

/** Nombre de la entrada (y del MP3) de una grabación que empieza ahora, ya traducido. */
export function recordingName(source: RecordingSource, date = new Date()): string {
  return entryName(source, recordingStamp(date))
}

/** Nombre de la entrada de una reunión que se empieza a grabar ahora (tarea 32). */
export function meetingRecordingName(date = new Date()): string {
  return i18n.t('mic.meetingName', { date: recordingStamp(date) })
}

/** Los nombres traducidos sin fecha, para que el main nombre las grabaciones del atajo. */
export function recordingNameTemplates(): RecordingNameTemplates {
  return Object.fromEntries(
    RECORDING_SOURCES.map((source) => [source, entryName(source, RECORDING_DATE_TOKEN)])
  ) as RecordingNameTemplates
}
