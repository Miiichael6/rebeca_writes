import { mkdir, open, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import type { LivePcmFiles } from '../../application/ports/livePcmFiles'
import { BYTES_PER_SAMPLE } from '../../domain/liveWindows'
import { pcmToWav } from '../../domain/pcmWav'

/** Adaptador de `LivePcmFiles` sobre el sistema de archivos; `jobTempDir` da la carpeta de cada trabajo. */
export function createFsPcmFiles(jobTempDir: (jobId: string) => string): LivePcmFiles {
  return {
    async size(pcm) {
      // Si el `.pcm` desaparece, la sesión conserva el último tamaño y la vigilancia la cierra.
      const info = await stat(pcm).catch(() => null)
      return info ? info.size : null
    },

    async read(pcm, position, length) {
      const file = await open(pcm, 'r')
      try {
        const buffer = Buffer.alloc(length)
        const { bytesRead } = await file.read(buffer, 0, length, position)
        return buffer.subarray(0, bytesRead - (bytesRead % BYTES_PER_SAMPLE))
      } finally {
        await file.close()
      }
    },

    async writeWindow(jobId, windowId, pcm) {
      const dir = jobTempDir(jobId)
      const wav = join(dir, `${windowId}.wav`)
      await mkdir(dir, { recursive: true })
      await writeFile(wav, pcmToWav(pcm))
      return wav
    },

    remove: (path) => rm(path, { force: true }),

    async cleanup(jobId, pcm) {
      await rm(pcm, { force: true }).catch(() => {})
      await rm(jobTempDir(jobId), { recursive: true, force: true }).catch(() => {})
    }
  }
}
