import { rename } from 'fs/promises'
import type { MediaOpener } from '../../application/mediaOpener'
import type { Disk } from '../../application/ports/disk'
import type { HistoryMedia } from '../../application/ports/historyMedia'
import type { Shell } from '../../application/ports/shell'
import type { PreviewService } from '../../application/previewService'
import { isSafeMediaPath, type MediaRegistry } from '../../domain/mediaRegistry'

export interface HistoryMediaDeps {
  registry: MediaRegistry
  opener: MediaOpener
  previews: PreviewService
  disk: Disk
  shell: Shell
}

/** Adaptador de `HistoryMedia` sobre `media://`, la caché de vistas previas y el Explorador. */
export function createHistoryMedia({
  registry,
  opener,
  previews,
  disk,
  shell
}: HistoryMediaDeps): HistoryMedia {
  return {
    isSafePath: isSafeMediaPath,
    exists: (path) => disk.exists(path),
    rename: (from, to) => rename(from, to),
    open: (path) => opener.open(path),
    unregister: (path) => registry.unregisterPath(path),
    clearPreviewCache: () => previews.clearCache(),
    showInFolder: (path) => shell.showItemInFolder(path)
  }
}
