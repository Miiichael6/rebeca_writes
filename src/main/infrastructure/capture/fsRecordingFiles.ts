import { randomUUID } from 'crypto'
import { createWriteStream } from 'fs'
import { access, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import type { RecordingFiles } from '../../application/ports/recordingFiles'
import { numberedFileName, recordingFileName } from '../../domain/capture/recordingFile'

/** Adaptador de `RecordingFiles` sobre el sistema de archivos; los `.pcm` van a `pcmDir`. */
export function createFsRecordingFiles(pcmDir: string): RecordingFiles {
  return {
    async createPcm() {
      await mkdir(pcmDir, { recursive: true })
      const path = join(pcmDir, `${randomUUID()}.pcm`)
      const stream = createWriteStream(path)
      await new Promise<void>((resolve, reject) => {
        stream.once('open', () => resolve())
        stream.once('error', reject)
      })
      return {
        path,
        writer: {
          append: (chunk) => {
            if (chunk.length > 0) stream.write(chunk)
          },
          close: () =>
            new Promise<void>((resolve, reject) => {
              stream.once('error', reject)
              stream.end(() => resolve())
            })
        }
      }
    },

    async freeRecordingPath(dir, name) {
      await mkdir(dir, { recursive: true })
      const base = recordingFileName(name)
      for (let attempt = 1; ; attempt++) {
        const path = join(dir, numberedFileName(base, attempt))
        const taken = await access(path).then(
          () => true,
          () => false
        )
        if (!taken) return path
      }
    },

    remove: (path) => rm(path, { force: true })
  }
}
