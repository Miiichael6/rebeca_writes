import { join } from 'path'
import type { CustomModel, ModelStore } from '../../application/ports/modelStore'
import { hasGgmlHeader } from '../downloads/modelDownload'
import { readJsonSafe, writeJsonAtomic } from './fsAtomic'

/** Adaptador de `ModelStore`: la lista de modelos propios vive en `<dir>/custom.json`. */
export function createJsonModelStore(dir: string): ModelStore {
  const listPath = join(dir, 'custom.json')
  return {
    dir,
    async readCustom() {
      const data = await readJsonSafe<unknown>(listPath, [])
      return Array.isArray(data) ? (data as CustomModel[]) : []
    },
    writeCustom: (models) => writeJsonAtomic(listPath, models),
    isGgmlFile: hasGgmlHeader
  }
}
