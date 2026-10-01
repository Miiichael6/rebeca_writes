/** Lo que se muestra de un Release de GitHub, sacado de lo que devuelve electron-updater. */

type ReleaseNotes = string | readonly { note?: string | null }[] | null | undefined

/** Notas del Release como texto plano: se quitan etiquetas HTML (llegan del Release, no son de fiar). */
export function releaseNotesText(raw: ReleaseNotes): string | undefined {
  const text = Array.isArray(raw) ? raw.map((n) => n.note ?? '').join('\n\n') : (raw ?? '')
  const plain = String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return plain || undefined
}

/** Tamaño del instalador `.exe` entre los archivos del Release (0 si no se sabe). */
export function installerSize(files: readonly { url: string; size?: number }[]): number {
  const file = files.find((f) => f.url.toLowerCase().endsWith('.exe')) ?? files[0]
  return file?.size ?? 0
}
