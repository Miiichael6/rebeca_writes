import i18n from '@renderer/i18n'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { aiText } from './aiText'
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

/**
 * "Copiar para IA" (tarea 38): con marcas de tiempo, pero sin `[BLANK_AUDIO]` ni bucles de
 * repetición. El aviso dice cuánto texto se ahorró frente a la copia normal con marcas.
 */
export async function copyTranscriptForAi(): Promise<void> {
  const { segments, entry } = useTranscriptStore.getState()
  if (segments.length === 0) return
  const names = speakerNamesOf(segments, entry?.speakers)
  const text = aiText(segments, names)
  await window.api.clipboard.writeText(text)
  const full = transcriptText(segments, false, names).length
  const saved = full > 0 ? Math.max(0, Math.round((1 - text.length / full) * 100)) : 0
  toast(i18n.t('bottomBar.copiedForAi', { percent: saved }))
}
