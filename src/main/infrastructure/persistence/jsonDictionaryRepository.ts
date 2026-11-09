import type { DictionaryEntry } from '@shared/dictionary'
import type { DictionaryRepository } from '../../application/ports/dictionaryRepository'
import {
  dictionaryFile,
  parseDictionaryEntries,
  parseDictionaryFile
} from '../../domain/dictionary'
import { readJsonSafe, writeJsonAtomic } from './fsAtomic'

/** Adaptador del diccionario sobre `userData/dictionary.json`, escrito siempre de forma atómica. */

export interface JsonDictionaryRepositoryOptions {
  path: string
  onCorrupt?: (backupPath: string, error: unknown) => void
}

export class JsonDictionaryRepository implements DictionaryRepository {
  private loading: Promise<DictionaryEntry[]> | null = null

  constructor(private readonly options: JsonDictionaryRepositoryOptions) {}

  load(): Promise<DictionaryEntry[]> {
    this.loading ??= readJsonSafe<unknown>(this.options.path, [], this.options.onCorrupt)
      .then(parseDictionaryFile)
      .catch((err) => {
        this.loading = null
        throw err
      })
    return this.loading
  }

  async save(entries: unknown): Promise<DictionaryEntry[]> {
    const valid = parseDictionaryEntries(entries)
    await writeJsonAtomic(this.options.path, dictionaryFile(valid))
    this.loading = Promise.resolve(valid)
    return valid
  }
}
