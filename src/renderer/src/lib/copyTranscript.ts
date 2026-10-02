import i18n from '@renderer/i18n'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { speakerNamesOf } from './speakerNames'
import { transcriptText } from './transcriptText'

/**
 * Copia la transcripción abierta como se ve ("Unir líneas" incluido) y avisa con un toast.
 * Lo usan el botón de la barra inferior y `Ctrl+C` sin selección en la transcripción.
 */
export async function copyTranscript(): Promise<void> {
  const { segments, entry } = useTranscriptStore.getState()
  if (segments.length === 0) return
  const joinLines = useSettingsStore.getState().settings.joinLines
  const names = speakerNamesOf(segments, entry?.speakers)
  await window.api.clipboard.writeText(transcriptText(segments, joinLines, names))
  toast(i18n.t('bottomBar.copied'))
}
