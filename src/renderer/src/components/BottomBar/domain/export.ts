import type { ExportFormat } from '@shared/exporters'

/** Formatos del menú Exportar, en orden, con la clave de i18n (bajo `bottomBar.`) de su texto. */
export const EXPORT_ENTRIES = [
  { format: 'txtTimestamps', labelKey: 'exportTxtTimestamps' },
  { format: 'txt', labelKey: 'exportTxt' },
  { format: 'vtt', labelKey: 'exportVtt' },
  { format: 'lrc', labelKey: 'exportLrc' },
  { format: 'srt', labelKey: 'exportSrt' }
] as const satisfies readonly { format: ExportFormat; labelKey: string }[]

/** `Ctrl+E` abre el menú Exportar (spec §6). */
export function isExportShortcut(e: KeyboardEvent): boolean {
  return e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'e'
}
