import { IpcChannel } from '@shared/ipc'
import type { UpdateInstallResult, UpdateStatus } from '@shared/types'
import { installBlocker, shouldAutoCheck, updateErrorCode } from '../domain/updatePolicy'
import type { Disk } from './ports/disk'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { SettingsRepository } from './ports/settingsRepository'
import type { Updater } from './ports/updater'

/** Margen libre extra sobre el tamaño del Release al descargar. */
const DISK_MARGIN_BYTES = 100 * 1024 * 1024
/** Espera tras abrir la ventana antes de la comprobación automática. */
const AUTO_CHECK_DELAY_MS = 10_000

export interface UpdateServiceDeps {
  updater: Updater
  settings: SettingsRepository
  disk: Disk
  publisher: EventPublisher
  log: Logger
  /** Carpeta cuyo volumen se mide antes de descargar. */
  dataDir: string
  /** Estado que impide reiniciar: hay una transcripción o la descarga de CUDA en marcha. */
  busy: () => { transcribing: boolean; cudaJob: boolean }
}

/** Actualizaciones de la app: comprobar, descargar con margen de disco e instalar al reiniciar. */
export class UpdateService {
  private status: UpdateStatus = { state: 'idle' }
  private lastCheckAt: number | null = null
  private phase: 'check' | 'download' = 'check'
  private found: { version: string; sizeBytes: number } | null = null

  constructor(private readonly deps: UpdateServiceDeps) {
    const { updater, log } = deps
    updater.on('checking', () => this.setStatus({ state: 'checking' }))
    updater.on('available', (info) => {
      this.found = { version: info.version, sizeBytes: info.sizeBytes }
      this.setStatus({
        state: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes,
        sizeBytes: info.sizeBytes
      })
    })
    updater.on('notAvailable', () => {
      this.found = null
      this.markUpToDate()
    })
    updater.on('progress', (p) =>
      this.setStatus({
        state: 'downloading',
        version: this.found?.version ?? '',
        received: p.transferred,
        total: p.total,
        bytesPerSec: p.bytesPerSecond,
        etaSec:
          p.bytesPerSecond > 0 ? Math.ceil((p.total - p.transferred) / p.bytesPerSecond) : null
      })
    )
    updater.on('downloaded', (version) => {
      log.info(`Actualización ${version} descargada`)
      this.setStatus({ state: 'ready', version })
    })
    updater.on('error', (err) => {
      log.error(`Actualizador (${this.phase})`, err)
      this.setStatus({ state: 'error', code: updateErrorCode(err, this.phase) })
    })
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  async check(): Promise<UpdateStatus> {
    // En desarrollo no hay `app-update.yml`: se evita la llamada y el error.
    if (!this.deps.updater.available) {
      this.markUpToDate()
      return this.status
    }
    // No pisar una descarga en curso ni una actualización ya lista.
    const { state } = this.status
    if (state === 'checking' || state === 'downloading' || state === 'ready') return this.status
    this.phase = 'check'
    this.lastCheckAt = Date.now()
    await this.deps.updater.check().catch(() => {
      // El evento `error` ya dejó el estado; aquí solo se evita el rechazo sin capturar.
    })
    return this.status
  }

  async download(): Promise<UpdateStatus> {
    const { found } = this
    if (this.status.state !== 'available' || !found) return this.status
    const { updater, disk, log, dataDir } = this.deps
    try {
      if ((await disk.freeSpace(dataDir)) < found.sizeBytes + DISK_MARGIN_BYTES) {
        this.setStatus({ state: 'error', code: 'noDiskSpace' })
        return this.status
      }
    } catch (err) {
      log.warn('No se pudo medir el espacio libre; se descarga igual', err)
    }
    this.phase = 'download'
    this.setStatus({
      state: 'downloading',
      version: found.version,
      received: 0,
      total: found.sizeBytes,
      bytesPerSec: 0,
      etaSec: null
    })
    await updater.download().catch(() => {
      // Igual que en `check`: el evento `error` ya actualizó el estado.
    })
    return this.status
  }

  /**
   * Cierra e instala en silencio y reabre la app. Guardar la cola y el historial lo hace el
   * `before-quit` de `index.ts`, que `quitAndInstall` dispara al pedir el cierre.
   */
  install(): UpdateInstallResult {
    if (this.status.state !== 'ready') return { ok: false, reason: 'notReady' }
    const reason = installBlocker(this.deps.busy())
    if (reason) return { ok: false, reason }
    this.deps.log.info('Reiniciando para instalar la actualización')
    this.deps.updater.quitAndInstall()
    return { ok: true }
  }

  /** Comprobación al iniciar: unos segundos después de abrir la ventana. */
  scheduleAutoCheck(): void {
    setTimeout(() => {
      const allowed = shouldAutoCheck({
        packaged: this.deps.updater.available,
        autoCheck: this.deps.settings.get().autoCheckUpdates,
        lastCheckAt: this.lastCheckAt,
        now: Date.now()
      })
      if (allowed) void this.check()
    }, AUTO_CHECK_DELAY_MS)
  }

  private markUpToDate(): void {
    this.lastCheckAt = Date.now()
    this.setStatus({ state: 'upToDate', checkedAt: this.lastCheckAt })
  }

  private setStatus(next: UpdateStatus): void {
    this.status = next
    this.deps.publisher.publish(IpcChannel.UpdatesStatus, next)
  }
}
