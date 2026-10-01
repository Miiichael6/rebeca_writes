import { EventEmitter } from 'events'
import { createDefaultSettings, type Settings, type SettingsPatch } from '@shared/settings'
import type { SettingsRepository } from '../../application/ports/settingsRepository'
import { isRecord } from '../../domain/guards'
import { mergeSettings, migrateSettings } from '../../domain/settings'
import { DebouncedJsonWriter, readJsonSafe } from './fsAtomic'

/** Adaptador de los ajustes sobre `settings.json`, sin Electron: carga, migración y guardado con debounce. */

export interface JsonSettingsRepositoryEvents {
  changed: [settings: Settings]
}

export interface JsonSettingsRepositoryOptions {
  path: string
  cpuCount: number
  debounceMs?: number
  onCorrupt?: (backupPath: string, error: unknown) => void
}

export class JsonSettingsRepository implements SettingsRepository {
  readonly defaults: Settings
  private current: Settings | null = null
  private loading: Promise<Settings> | null = null
  private readonly writer: DebouncedJsonWriter
  private readonly events = new EventEmitter<JsonSettingsRepositoryEvents>()

  constructor(private readonly options: JsonSettingsRepositoryOptions) {
    this.defaults = createDefaultSettings(options.cpuCount)
    this.writer = new DebouncedJsonWriter(options.path, options.debounceMs ?? 300)
  }

  /** Lee el archivo una sola vez; después devuelve lo que hay en memoria. */
  async load(): Promise<Settings> {
    this.loading ??= this.read().catch((err) => {
      this.loading = null
      throw err
    })
    await this.loading
    return this.get()
  }

  private async read(): Promise<Settings> {
    const raw = await readJsonSafe<unknown>(this.options.path, {}, this.options.onCorrupt)
    const migrated = migrateSettings(isRecord(raw) ? raw : {})
    const settings = mergeSettings(this.defaults, migrated, this.options.cpuCount)
    this.current = settings
    // Deja el archivo en el formato actual (versión, claves nuevas, valores corregidos).
    if (JSON.stringify(raw) !== JSON.stringify(settings)) this.writer.schedule(() => this.current)
    return settings
  }

  /** Settings en memoria; los valores por defecto si `load()` aún no terminó (o falló). */
  get(): Settings {
    return this.current ?? this.defaults
  }

  /** Aplica un cambio parcial, lo guarda con debounce y emite `changed` si algo cambió. */
  async update(patch: SettingsPatch | Record<string, unknown>): Promise<Settings> {
    await this.load()
    // `get()` y no el resultado de `load()`: otro `update` pudo cambiarlo mientras se esperaba.
    const base = this.get()
    const next = mergeSettings(base, patch, this.options.cpuCount)
    if (JSON.stringify(next) === JSON.stringify(base)) return base
    this.current = next
    this.writer.schedule(() => this.current)
    this.events.emit('changed', next)
    return next
  }

  onChanged(listener: (settings: Settings) => void): () => void {
    this.events.on('changed', listener)
    return () => this.events.off('changed', listener)
  }

  flush(): Promise<void> {
    return this.writer.flush()
  }
}
