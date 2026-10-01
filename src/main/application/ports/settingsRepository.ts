import type { Settings, SettingsPatch } from '@shared/settings'

/** Puerto de salida: dónde se guardan los ajustes y cómo se avisa de sus cambios. */
export interface SettingsRepository {
  readonly defaults: Settings
  /** Lee los ajustes una sola vez; después devuelve lo que hay en memoria. */
  load(): Promise<Settings>
  /** Ajustes en memoria; los valores por defecto si `load()` aún no terminó (o falló). */
  get(): Settings
  /** Aplica un cambio parcial, lo guarda y avisa a los oyentes si algo cambió. */
  update(patch: SettingsPatch | Record<string, unknown>): Promise<Settings>
  /** Avisa de cada cambio. Devuelve la función para dejar de escuchar. */
  onChanged(listener: (settings: Settings) => void): () => void
  flush(): Promise<void>
}
