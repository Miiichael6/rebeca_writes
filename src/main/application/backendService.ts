import { IpcChannel } from '@shared/ipc'
import type { Backend, BackendInfo } from '@shared/types'
import { followDetected, isCudaDownloadable, needsDetection } from '../domain/detection'
import type { FallbackEvent } from '../domain/fallback'
import type { BackendBinaries } from './ports/backendBinaries'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { SettingsRepository } from './ports/settingsRepository'

interface Detection {
  detected: Backend
  installed: Backend[]
  nvidia: boolean
}

export interface BackendServiceDeps {
  binaries: BackendBinaries
  settings: SettingsRepository
  publisher: EventPublisher
  log: Logger
}

/**
 * Qué backend de whisper (CUDA, Vulkan o CPU) se usa: autodetección una vez por arranque,
 * el elegido en Configuración, cuáles están en uso y el aviso de fallback.
 */
export class BackendService {
  private detection: Promise<Detection> | null = null
  /** Transcripciones que están usando cada backend; el paquete CUDA no se borra mientras tanto. */
  private readonly inUse = new Map<Backend, number>()

  constructor(private readonly deps: BackendServiceDeps) {}

  /**
   * Backend elegido, detectado e instalados. La detección corre una sola vez por arranque (o tras
   * `reset`); el elegido se lee de settings en cada llamada, así un cambio en Configuración
   * vale desde la siguiente transcripción. Si el elegido no está instalado se usa el detectado.
   */
  async info(): Promise<BackendInfo> {
    this.detection ??= this.detect().catch((err) => {
      this.detection = null
      throw err
    })
    const { detected, installed, nvidia } = await this.detection
    const chosen = this.deps.settings.get().backend
    const backend = chosen && installed.includes(chosen) ? chosen : detected
    return {
      backend,
      detected,
      installed,
      nvidia,
      cudaDownloadable: isCudaDownloadable(nvidia, installed)
    }
  }

  /**
   * Repite la detección tras instalar o quitar un backend, sin reiniciar la app. Como cambian los
   * instalados, `detect` vuelve a probarlos; el renderer se entera por `backend:changed`.
   */
  async reset(): Promise<BackendInfo> {
    this.detection = null
    const info = await this.info()
    this.notifyChanged()
    return info
  }

  /** Avisa al renderer de que cambió algo del backend (p. ej. empieza una descarga de CUDA). */
  notifyChanged(): void {
    this.deps.publisher.publish(IpcChannel.BackendChanged, undefined)
  }

  /** Marca el backend como en uso; devuelve la función para soltarlo. */
  acquire(backend: Backend): () => void {
    this.inUse.set(backend, (this.inUse.get(backend) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      const count = (this.inUse.get(backend) ?? 1) - 1
      if (count > 0) this.inUse.set(backend, count)
      else this.inUse.delete(backend)
    }
  }

  isInUse(backend: Backend): boolean {
    return this.inUse.has(backend)
  }

  /** Avisa al renderer para el toast "X no disponible, se usó Y". */
  notifyFallback = ({ from, to, reason }: FallbackEvent): void => {
    this.deps.log.warn(`Fallback de backend: ${from} → ${to} (${reason})`)
    this.deps.publisher.publish(IpcChannel.BackendFallback, { from, to })
  }

  /** Autodetección (spec §2.1): CUDA si hay NVIDIA y carga, si no Vulkan, si no CPU. */
  private async detectBackend(installed: readonly Backend[], nvidia: boolean): Promise<Backend> {
    const { binaries } = this.deps
    if (installed.includes('cuda') && nvidia && (await binaries.probe('cuda'))) return 'cuda'
    if (installed.includes('vulkan') && (await binaries.probe('vulkan'))) return 'vulkan'
    return 'cpu'
  }

  private async detect(): Promise<Detection> {
    const { binaries, settings, log } = this.deps
    const installed = binaries.installed()
    const saved = await settings.load()
    // nvidia-smi se consulta siempre (es rápido): decide si se ofrece descargar CUDA.
    const nvidia = await binaries.hasNvidiaGpu()

    let detected: Backend
    let backend: Backend
    if (saved.detectedBackend && !needsDetection(saved, installed)) {
      detected = saved.detectedBackend
      backend = saved.backend ?? detected
    } else {
      const started = Date.now()
      detected = await this.detectBackend(installed, nvidia)
      log.info(`Backend detectado: ${detected} en ${Date.now() - started} ms`)
      backend = followDetected(saved.backend, saved.detectedBackend, detected)
    }

    const installedChanged = saved.installedBackends.join() !== installed.join()
    if (saved.detectedBackend !== detected || saved.backend !== backend || installedChanged) {
      await settings.update({ detectedBackend: detected, backend, installedBackends: installed })
    }
    // El elegido se conserva aunque no esté instalado (vuelve a valer si se reinstala); se usa el detectado.
    const effective = installed.includes(backend) ? backend : detected
    log.info(
      `Backend: ${effective} (elegido ${backend}, detectado ${detected}, instalados: ${installed.join(', ')}, NVIDIA: ${nvidia})`
    )
    return { detected, installed, nvidia }
  }
}
