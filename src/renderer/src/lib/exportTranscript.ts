import type { ExportFormat } from '@shared/exporters'
import i18n from '@renderer/i18n'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { speakerNamesOf } from './speakerNames'

/**
 * Menú Exportar (tarea 20). Se exportan los segmentos que se ven, con las ediciones; el main
 * pone el formato, el diálogo y la escritura en UTF-8.
 */

const FILTER_KEYS = {
  txtTimestamps: 'bottomBar.filterTxt',
  txt: 'bottomBar.filterTxt',
  vtt: 'bottomBar.filterVtt',
  lrc: 'bottomBar.filterLrc',
  srt: 'bottomBar.filterSrt'
} as const satisfies Record<ExportFormat, string>

const fileName = (path: string): string =>
  path.slice(Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')) + 1)

/** "Guardado: x.srt" con el botón "Mostrar en el Explorador". */
function announceSaved(path: string): void {
  toast(i18n.t('bottomBar.exported', { name: fileName(path) }), 6000, {
    label: i18n.t('bottomBar.showInFolder'),
    onSelect: () => void window.api.export.showInFolder(path)
  })
}

function exportFailed(err: unknown): void {
  console.error('No se pudo exportar', err)
  toast(i18n.t('bottomBar.exportFailed'), 4000)
}

/** "como .xxx...": diálogo Guardar como. El `.txt` respeta "Unir líneas". */
export async function exportAs(format: ExportFormat): Promise<void> {
  const { entry, segments } = useTranscriptStore.getState()
  if (!entry || segments.length === 0) return
  const joined = format === 'txt' && useSettingsStore.getState().settings.joinLines
  try {
    const saved = await window.api.export.save(
      entry.id,
      format,
      segments,
      { joined, speakerNames: speakerNamesOf(segments, entry.speakers) },
      i18n.t(FILTER_KEYS[format])
    )
    if (saved) announceSaved(saved.path)
  } catch (err) {
    exportFailed(err)
  }
}

/**
 * "Guardar .srt junto al archivo". Si ya hay uno con ese nombre y no se pidió reemplazarlo,
 * devuelve su ruta para que la vista pregunte; si no, `null`.
 */
export async function saveSrtNextToFile(overwrite = false): Promise<string | null> {
  const { entry, segments } = useTranscriptStore.getState()
  if (!entry || segments.length === 0) return null
  try {
    const result = await window.api.export.saveSrtBeside(
      entry.id,
      segments,
      overwrite,
      speakerNamesOf(segments, entry.speakers)
    )
    if (result.status === 'exists') return result.path
    if (result.status === 'missing') toast(i18n.t('bottomBar.srtMissing'), 4000)
    else announceSaved(result.path)
  } catch (err) {
    exportFailed(err)
  }
  return null
}

export { fileName as exportFileName }
