import { IpcChannel } from '@shared/ipc'
import type { MediaInfo, MediaPreviewEvent, PreviewStatus } from '@shared/types'
import { previewPlan } from '../domain/previewPlan'
import type { MediaRegistry } from '../domain/mediaRegistry'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { PreviewGenerator } from './ports/previewGenerator'

/**
 * Estado de las vistas previas de los medios abiertos: pide la generación, la sigue y avisa
 * al renderer de cada cambio. Registra en la lista blanca de `media://` lo que se genera.
 */
export class PreviewService {
  /** Último estado enviado por id de medio: lo necesita `statusFor` si el archivo se reabre. */
  private readonly statuses = new Map<string, PreviewStatus>()

  constructor(
    private readonly generator: PreviewGenerator,
    private readonly registry: MediaRegistry,
    private readonly publisher: EventPublisher,
    private readonly log: Logger
  ) {
    generator.on('audio', (input, audioPath) => {
      const status = this.statuses.get(this.registry.register(input))
      const percent = status?.state === 'pending' ? status.percent : 0
      this.update(input, {
        state: 'pending',
        audioId: this.registry.register(audioPath),
        percent
      })
    })
    generator.on('progress', (input, percent) => {
      this.update(input, { state: 'pending', audioId: this.audioIdOf(input), percent })
    })
    generator.on('ready', (input, previewPath) => {
      this.update(input, { state: 'ready', id: this.registry.register(previewPath) })
    })
    generator.on('failed', (input, error) => {
      this.log.error(`No se pudo generar la vista previa de ${input}`, error)
      this.update(input, { state: 'failed', audioId: this.audioIdOf(input) })
    })
  }

  /**
   * Estado de la vista previa de un medio recién abierto. Si hace falta y no existe, empieza
   * a generarla en segundo plano y devuelve `pending` sin esperar.
   */
  async statusFor(
    filePath: string,
    mediaId: string,
    info: MediaInfo | null
  ): Promise<PreviewStatus> {
    // Sin probe no se sabe si hace falta: el `<video>` prueba con el original.
    const plan = info ? previewPlan(info) : null
    if (!info || !plan) return { state: 'none' }

    const found = await this.generator.lookup(filePath, plan)
    if (found && 'path' in found) {
      const status: PreviewStatus = { state: 'ready', id: this.registry.register(found.path) }
      this.statuses.set(mediaId, status)
      return status
    }
    const known = this.statuses.get(mediaId)
    if (found && known?.state === 'pending') return known

    const status: PreviewStatus = {
      state: 'pending',
      audioId: plan.audio === 'original' ? mediaId : null,
      percent: 0
    }
    this.statuses.set(mediaId, status)
    if (!found) {
      this.generator.request(filePath, plan, info.durationSec).catch((err) => {
        this.log.error(`No se pudo pedir la vista previa de ${filePath}`, err)
        this.update(filePath, { state: 'failed', audioId: status.audioId })
      })
    }
    return status
  }

  /** Vacía la caché (Borrar historial, Vaciar caché). Nunca toca los archivos originales. */
  async clearCache(): Promise<void> {
    await this.generator.clear()
    this.statuses.clear()
    this.publish({ cleared: true })
  }

  cacheSize(): Promise<number> {
    return this.generator.size()
  }

  /** Mata ffmpeg al salir; lo que quede a medias se borra en el próximo arranque. */
  dispose(): void {
    this.generator.dispose()
  }

  private update(input: string, status: PreviewStatus): void {
    const mediaId = this.registry.register(input)
    this.statuses.set(mediaId, status)
    this.publish({ mediaId, status })
  }

  private audioIdOf(input: string): string | null {
    const status = this.statuses.get(this.registry.register(input))
    return status && status.state === 'pending' ? status.audioId : null
  }

  private publish(payload: MediaPreviewEvent): void {
    this.publisher.publish(IpcChannel.MediaPreview, payload)
  }
}
