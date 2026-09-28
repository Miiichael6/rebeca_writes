import type { Segment } from './types'

/**
 * Exportadores de la transcripción. Por ahora solo `.srt`, que la cola guarda junto al
 * archivo (tarea 17); los demás formatos y el menú Exportar llegan en la tarea 20.
 */

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** `hh:mm:ss,mmm`. Se redondea a milisegundos antes de partir (1.9999 s → `00:00:02,000`). */
export function srtTimestamp(sec: number): string {
  const totalMs = Math.max(0, Math.round(sec * 1000))
  const h = Math.floor(totalMs / 3_600_000)
  const m = Math.floor((totalMs % 3_600_000) / 60_000)
  const s = Math.floor((totalMs % 60_000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(totalMs % 1000, 3)}`
}

/** SubRip: índice, `inicio --> fin`, texto y línea en blanco. Salta segmentos sin texto. */
export function toSrt(segments: Segment[]): string {
  return segments
    .filter((s) => s.text.trim())
    .map(
      (s, i) => `${i + 1}\n${srtTimestamp(s.start)} --> ${srtTimestamp(s.end)}\n${s.text.trim()}\n`
    )
    .join('\n')
}

/** Nombre sin la última extensión: `clase.01.mp4` → `clase.01`. */
function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** `<archivo sin ext>.<idioma>.srt`, el nombre que reconocen Jellyfin y Plex. */
export function srtFileName(fileName: string, language: string): string {
  return `${baseName(fileName)}.${language}.srt`
}

/**
 * ¿Hay un subtítulo para `fileName` entre `siblings` (nombres de la misma carpeta)?
 * Vale `<nombre>.srt` y `<nombre>.<lo que sea>.srt`, sin distinguir mayúsculas (Windows).
 */
export function hasSiblingSrt(fileName: string, siblings: string[]): boolean {
  const base = baseName(fileName).toLowerCase()
  return siblings.some((name) => {
    const n = name.toLowerCase()
    return n === `${base}.srt` || (n.startsWith(`${base}.`) && n.endsWith('.srt'))
  })
}
