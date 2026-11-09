import {
  activeEntries,
  isDictionaryFileFormat,
  type DictionaryEntry,
  type DictionaryImportedFile
} from '@shared/dictionary'
import { reapplyDictionary, type ReappliedSegments } from '@shared/reapplyDictionary'
import { isValidHistoryId } from '../domain/history'
import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { DictionaryRepository } from './ports/dictionaryRepository'
import type { Disk } from './ports/disk'
import type { HistoryRepository } from './ports/historyRepository'
import type { SettingsRepository } from './ports/settingsRepository'

/** Un diccionario de 1000 palabras en CSV o JSON ocupa bastante menos. */
const MAX_IMPORT_BYTES = 1024 * 1024
const DEFAULT_FILE_NAME = 'diccionario'
/** Estados en los que la transcripción ya no cambia y se puede corregir. */
const FINISHED = new Set(['done', 'error', 'cancelled'])

export interface DictionaryServiceDeps {
  repository: DictionaryRepository
  settings: Pick<SettingsRepository, 'load'>
  history: Pick<HistoryRepository, 'get' | 'setSegments'>
  dialogs: Pick<Dialogs, 'pickFile' | 'pickSavePath'>
  disk: Pick<Disk, 'fileSize' | 'readText' | 'writeTextAtomic'>
}

/**
 * Diccionario de reemplazos (tareas 41 y 42): la lista guardada, las entradas que se aplican
 * al transcribir (solo con el interruptor `dictionaryEnabled` encendido), importar y exportar
 * el archivo y aplicarlo a una transcripción del historial.
 */
export class DictionaryService {
  constructor(private readonly deps: DictionaryServiceDeps) {}

  get(): Promise<DictionaryEntry[]> {
    return this.deps.repository.load()
  }

  set(entries: unknown): Promise<DictionaryEntry[]> {
    return this.deps.repository.save(entries)
  }

  /** Entradas que se aplican ahora; vacío con el diccionario apagado. */
  async active(): Promise<DictionaryEntry[]> {
    const { dictionaryEnabled } = await this.deps.settings.load()
    return dictionaryEnabled ? activeEntries(await this.deps.repository.load()) : []
  }

  /** Texto de un `.json` o `.csv` elegido por el usuario; lo interpreta el renderer. */
  async importFile(owner: DialogOwner): Promise<DictionaryImportedFile | null> {
    const { dialogs, disk } = this.deps
    const path = await dialogs.pickFile(owner, [{ name: 'JSON, CSV', extensions: ['json', 'csv'] }])
    if (!path) return null
    if ((await disk.fileSize(path)) > MAX_IMPORT_BYTES) {
      throw new Error('El archivo del diccionario es demasiado grande')
    }
    const format = path.toLowerCase().endsWith('.csv') ? 'csv' : 'json'
    return { format, content: await disk.readText(path) }
  }

  /** "Guardar como" del diccionario ya serializado por el renderer. */
  async exportFile(
    owner: DialogOwner,
    content: unknown,
    format: unknown,
    filterLabel: unknown
  ): Promise<string | null> {
    if (typeof content !== 'string' || !isDictionaryFileFormat(format)) {
      throw new Error('Exportación del diccionario inválida')
    }
    const path = await this.deps.dialogs.pickSavePath(owner, {
      defaultPath: `${DEFAULT_FILE_NAME}.${format}`,
      filterName: typeof filterLabel === 'string' && filterLabel ? filterLabel : format,
      extension: format
    })
    if (!path) return null
    await this.deps.disk.writeTextAtomic(path, content)
    return path
  }

  /**
   * Aplica las palabras activas (aunque el interruptor esté apagado: lo pide el usuario) a una
   * transcripción terminada y guarda el resultado. `null` si no existe o aún se transcribe.
   */
  async applyTo(id: unknown): Promise<ReappliedSegments | null> {
    if (!isValidHistoryId(id)) return null
    const saved = await this.deps.history.get(id)
    if (!saved || !FINISHED.has(saved.entry.status)) return null
    const entries = activeEntries(await this.deps.repository.load())
    const result = reapplyDictionary(saved.segments, entries)
    if (result.changed > 0) await this.deps.history.setSegments(id, result.segments)
    return result
  }
}
