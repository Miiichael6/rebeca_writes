import { mkdir, readdir, rm, statfs } from 'fs/promises'
import { existsSync } from 'fs'
import type { Disk } from '../../application/ports/disk'
import { writeTextAtomic } from '../persistence/fsAtomic'
import { fileSize } from '../downloads/modelDownload'

/** Adaptador de `Disk` sobre `fs`. */
export const nodeDisk: Disk = {
  exists: (path) => Promise.resolve(existsSync(path)),
  fileSize,
  async freeSpace(dir) {
    const stats = await statfs(dir)
    return stats.bavail * stats.bsize
  },
  async ensureDir(dir) {
    await mkdir(dir, { recursive: true })
  },
  listDir: (dir) => readdir(dir).catch(() => []),
  remove: (path) => rm(path, { recursive: true, force: true }),
  writeTextAtomic
}
