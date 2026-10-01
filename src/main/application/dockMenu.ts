import type { DockMenuAction, DockMenuSize } from '@shared/dock'
import type { Dock } from './dock'
import type { MicRecording } from './micRecording'
import type { DockMenuSurface } from './ports/dockSurface'
import type { Logger } from './ports/eventPublisher'
import type { SettingsRepository } from './ports/settingsRepository'

export interface DockMenuDeps {
  surface: DockMenuSurface
  dock: Pick<Dock, 'askQuit' | 'record'>
  mic: Pick<MicRecording, 'stop'>
  settings: Pick<SettingsRepository, 'update'>
  showMainWindow: () => void
  log: Logger
}

/**
 * El menú contextual del dock (tarea 30): abrir la app, grabar con una fuente (que queda
 * elegida para la próxima vez), parar y guardar, o salir preguntando antes en la píldora.
 */
export class DockMenu {
  constructor(private readonly deps: DockMenuDeps) {}

  prepare(): void {
    this.deps.surface.prepare()
  }

  open(): void {
    this.deps.surface.open()
  }

  isOpen(): boolean {
    return this.deps.surface.isOpen()
  }

  resize(size: DockMenuSize): void {
    this.deps.surface.resize(size)
  }

  close(): void {
    this.deps.surface.close()
  }

  async choose(action: DockMenuAction): Promise<void> {
    this.deps.surface.hide()
    switch (action.kind) {
      case 'open':
        return this.deps.showMainWindow()
      case 'record':
        await this.deps.settings
          .update({ recordingSource: action.source })
          .catch((err) => this.deps.log.error('Dock: no se pudo guardar la fuente', err))
        return this.deps.dock.record(action.source, action.name)
      case 'stop':
        return this.deps.mic.stop()
      case 'quit':
        return this.deps.dock.askQuit()
      case 'close':
        return
    }
  }
}
