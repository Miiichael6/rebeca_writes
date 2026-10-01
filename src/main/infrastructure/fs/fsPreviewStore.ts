import { mkdir, readdir, rename, rm, stat, utimes } from 'fs/promises'
import { join } from 'path'
import type { PreviewStore } from '../../application/ports/previewStore'
import { isLeftover, isPartial, previewKey, type CacheFile } from '../../domain/previewPlan'

/**
 * Adaptador de `PreviewStore` sobre una carpeta. El uso se marca con la fecha de
 * modificación (`utimes`), porque Windows no actualiza `atime` de forma fiable.
 */
export function fsPreviewStore(dir: string): PreviewStore {
  const pathOf = (name: string): string => join(dir, name)
  const names = (): Promise<string[]> => readdir(dir).catch(() => [])
  const remove = (name: string): Promise<void> =>
    rm(pathOf(name), { force: true, recursive: true }).catch(() => {})

  return {
    async prepare() {
      await mkdir(dir, { recursive: true })
      for (const name of await names()) if (isLeftover(name)) await remove(name)
    },

    async keyFor(input) {
      const info = await stat(input)
      return previewKey(input, info.size, info.mtimeMs)
    },

    pathOf,

    async touch(name) {
      const now = new Date()
      try {
        await utimes(pathOf(name), now, now)
        return true
      } catch {
        // Si existe pero no se deja marcar, sirve igual; solo pierde su turno en el LRU.
        return stat(pathOf(name)).then(
          () => true,
          () => false
        )
      }
    },

    commit: (part, name) => rename(pathOf(part), pathOf(name)),

    remove,

    async list() {
      const files: CacheFile[] = []
      for (const name of await names()) {
        if (isPartial(name)) continue
        try {
          const info = await stat(pathOf(name))
          if (info.isFile()) files.push({ name, size: info.size, mtimeMs: info.mtimeMs })
        } catch {
          // Borrado mientras tanto.
        }
      }
      return files
    },

    async totalSize() {
      let total = 0
      for (const name of await names()) {
        total += await stat(pathOf(name)).then(
          (info) => info.size,
          () => 0
        )
      }
      return total
    },

    async removeAll() {
      for (const name of await names()) await remove(name)
    }
  }
}
