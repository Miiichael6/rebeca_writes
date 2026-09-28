import i18n from '@renderer/i18n'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { transcriptText } from './transcriptText'

/**
 * Copia la transcripción abierta como se ve ("Unir líneas" incluido) y avisa con un toast.
 * Lo usan el botón de la barra inferior y `Ctrl+C` sin selección en la transcripción.
 */
export async function copyTranscript(): Promise<void> {
  const segments = useTranscriptStore.getState().segments
  if (segments.length === 0) return
  const joinLines = useSettingsStore.getState().settings.joinLines
  await window.api.clipboard.writeText(transcriptText(segments, joinLines))
  toast(i18n.t('bottomBar.copied'))
}
