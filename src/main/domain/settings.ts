import { SUPPORTED_UI_LANGUAGES } from '@shared/i18n'
import { RECORDING_SOURCES } from '@shared/recording'
import {
  SETTINGS_VERSION,
  VIDEO_HEIGHT_MAX,
  VIDEO_HEIGHT_MIN,
  type QueueSettings,
  type Settings,
  type WindowBounds
} from '@shared/settings'
import type { Backend } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { isRecord } from './guards'

/** Reglas de `settings.json`: validación, mezcla de cambios parciales y migración de versiones. */

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
    autoCheckUpdates: bool,
    previewCacheMaxGB: positive,
    recordingSource: oneOf(RECORDING_SOURCES),
    recordingsDir: text(1000)
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
