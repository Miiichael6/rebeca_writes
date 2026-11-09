import { activeEntries, type DictionaryEntry } from '@shared/dictionary'
import type { DictionaryRepository } from './ports/dictionaryRepository'
import type { SettingsRepository } from './ports/settingsRepository'

/**
 * Diccionario de reemplazos (tarea 41): la lista guardada y las entradas que se aplican al
 * transcribir, solo con el interruptor `dictionaryEnabled` encendido.
 */
export class DictionaryService {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly settings: Pick<SettingsRepository, 'load'>
  ) {}

  get(): Promise<DictionaryEntry[]> {
    return this.repository.load()
  }

  set(entries: unknown): Promise<DictionaryEntry[]> {
    return this.repository.save(entries)
  }

  /** Entradas que se aplican ahora; vacío con el diccionario apagado. */
  async active(): Promise<DictionaryEntry[]> {
    const { dictionaryEnabled } = await this.settings.load()
    return dictionaryEnabled ? activeEntries(await this.repository.load()) : []
  }
}
