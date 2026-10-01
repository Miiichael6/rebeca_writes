import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { SettingsRepository } from './ports/settingsRepository'

/**
 * La carpeta de las grabaciones del micrófono (tarea 29): la de Configuración, o
 * `Documentos\RebeccaWrites\Grabaciones` si no se eligió ninguna.
 */
export class RecordingsFolder {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly dialogs: Dialogs,
    private readonly defaultDir: string
  ) {}

  dir(): string {
    return this.settings.get().recordingsDir || this.defaultDir
  }

  /** "Cambiar…" en Configuración: la elegida se guarda en ajustes. `null` si se cancela. */
  async pick(owner: DialogOwner): Promise<string | null> {
    const picked = await this.dialogs.pickFolder(owner, this.dir())
    if (picked) await this.settings.update({ recordingsDir: picked })
    return picked
  }
}
