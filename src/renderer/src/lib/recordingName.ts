import type { RecordingSource } from '@shared/recording'
import i18n from '@renderer/i18n'
import { recordingStamp } from '@renderer/components/MicButton/domain/mic'

/** Nombre de la entrada (y del MP3) de una grabación que empieza ahora, ya traducido. */
export function recordingName(source: RecordingSource, date = new Date()): string {
  return i18n.t('mic.entryName', {
    date: recordingStamp(date),
    source: i18n.t(`mic.sources.${source}`)
  })
}
