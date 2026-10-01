import { rm } from 'fs/promises'
import { join } from 'path'
import type { TempWorkspace } from '../../application/ports/tempWorkspace'

/** Carpeta temporal de un trabajo: `<root>/<jobId>/` (WAV de ffmpeg, spec §2.3). */
export function createTempWorkspace(root: string): TempWorkspace {
  const dir = (jobId: string): string => join(root, jobId)
  return {
    dir,
    remove: (jobId) => rm(dir(jobId), { recursive: true, force: true })
  }
}
