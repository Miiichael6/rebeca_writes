import { EventEmitter } from 'events'
import { SUPPORTED_UI_LANGUAGES } from '@shared/i18n'
import {
  createDefaultSettings,
  SETTINGS_VERSION,
  VIDEO_HEIGHT_MAX,
  VIDEO_HEIGHT_MIN,
  type QueueSettings,
  type Settings,
  type SettingsPatch,
  type WindowBounds
} from '@shared/settings'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { DebouncedJsonWriter, readJsonSafe } from './fsAtomic'

/**
 * `settings.json` sin Electron: carga, migración, validación y guardado con debounce.
 * El puente con la app (ruta, IPC, eventos al renderer) está en `settings.ts`.
 */

/** Devuelve el valor ya normalizado, o `undefined` si no vale (y se conserva el anterior). */
type Validator<T> = (value: unknown) => T | undefined

const bool: Validator<boolean> = (v) => (typeof v === 'boolean' ? v : undefined)

const text =
  (maxLength: number): Validator<string> =>
  (v) =>
    typeof v === 'string' ? v.slice(0, maxLength) : undefined

const int =
  (min: number, max: number): Validator<number> =>
  (v) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(max, Math.max(min, Math.round(v)))
      : undefined

const positive: Validator<number> = (v) =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

const oneOf =
  <T>(values: readonly T[]): Validator<T> =>
  (v) =>
    values.includes(v as T) ? (v as T) : undefined

const backendOrNull = oneOf([...BACKEND_ORDER, null])

/** Lista de backends sin repetidos y en el orden de preferencia. */
const backendList: Validator<Backend[]> = (v) =>
  Array.isArray(v) ? BACKEND_ORDER.filter((b) => v.includes(b)) : undefined

type FlatKey = Exclude<keyof Settings, 'version' | 'queue' | 'window'>

function validators(cpuCount: number): { [K in FlatKey]: Validator<Settings[K]> } {
  return {
    backend: backendOrNull,
    detectedBackend: backendOrNull,
    installedBackends: backendList,
    cudaOffered: bool,
    model: text(200),
    language: text(20),
    translate: bool,
    joinLines: bool,
    autoScroll: bool,
    promptEnabled: bool,
    prompt: text(10_000),
    maxLen: int(0, 10_000),
    suppressNst: bool,
    normalize: bool,
    threads: int(1, Math.max(1, cpuCount)),
    showCaptions: bool,
    videoHeight: int(VIDEO_HEIGHT_MIN, VIDEO_HEIGHT_MAX),
    theme: oneOf(['light', 'dark', 'system'] as const),
    uiLanguage: oneOf(['system', ...SUPPORTED_UI_LANGUAGES.map((l) => l.code)] as const),
    previewCacheMaxGB: positive
  }
}

const queueValidators: { [K in keyof QueueSettings]: Validator<QueueSettings[K]> } = {
  skipExistingSrt: bool,
  autoSaveSrt: bool
}

// Con varios monitores las coordenadas pueden ser negativas.
const coordinate = int(-100_000, 100_000)
const windowValidators: { [K in keyof WindowBounds]-?: Validator<WindowBounds[K]> } = {
  width: int(400, 100_000),
  height: int(300, 100_000),
  x: coordinate,
  y: coordinate,
  maximized: bool
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeWith<T extends object>(
  base: T,
  patch: Record<string, unknown>,
  rules: Record<string, Validator<unknown>>
): T {
  const next = { ...base } as Record<string, unknown>
  for (const [key, validate] of Object.entries(rules)) {
    if (!(key in patch)) continue
    const value = validate(patch[key])
    if (value !== undefined) next[key] = value
  }
  return next as T
}

/**
 * Aplica `patch` sobre `base` clave por clave. Lo desconocido o inválido se ignora y se
 * conserva el valor de `base`, así un archivo editado a mano nunca rompe la app.
 */
export function mergeSettings(base: Settings, patch: unknown, cpuCount: number): Settings {
  if (!isRecord(patch)) return base
  const next = mergeWith(base, patch, validators(cpuCount))
  if (isRecord(patch.queue)) next.queue = mergeWith(base.queue, patch.queue, queueValidators)
  if (isRecord(patch.window)) next.window = mergeWith(base.window, patch.window, windowValidators)
  return next
}

/**
 * Migraciones del archivo en crudo: `MIGRATIONS[n]` pasa de la versión `n` a la `n + 1`.
 * Para cambiar el formato: subir `SETTINGS_VERSION` y añadir aquí la función.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v0 era el archivo mínimo de la tarea 05 (`detectedBackend`, `backend`, `previewCacheMaxGB`),
  // con las mismas claves y tipos que v1.
  0: (raw) => raw
}

export function migrateSettings(raw: Record<string, unknown>): Record<string, unknown> {
  let version = typeof raw.version === 'number' ? raw.version : 0
  let data = raw
  while (version < SETTINGS_VERSION) {
    const migrate = MIGRATIONS[version]
    if (migrate) data = migrate(data)
    version++
  }
  return { ...data, version: SETTINGS_VERSION }
}

export interface SettingsStoreEvents {
  changed: [settings: Settings]
}

export interface SettingsStoreOptions {
  path: string
  cpuCount: number
  debounceMs?: number
  onCorrupt?: (backupPath: string, error: unknown) => void
}

export class SettingsStore extends EventEmitter<SettingsStoreEvents> {
  readonly defaults: Settings
  private current: Settings | null = null
  private loading: Promise<Settings> | null = null
  private readonly writer: DebouncedJsonWriter

  constructor(private readonly options: SettingsStoreOptions) {
    super()
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
    this.emit('changed', next)
    return next
  }

  flush(): Promise<void> {
    return this.writer.flush()
  }
}
