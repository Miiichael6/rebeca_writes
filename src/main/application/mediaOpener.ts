import { basename } from 'path'
import type { MediaFilterKey } from '@shared/formats'
import type { OpenedMedia } from '@shared/types'
import type { MediaRegistry } from '../domain/mediaRegistry'
import type { DialogOwner, Dialogs } from './ports/dialogs'
import type { Logger } from './ports/eventPublisher'
import type { MediaTools } from './ports/mediaTools'
import type { PreviewService } from './previewService'

/**
 * Abre archivos de audio o video: los registra en la lista blanca de `media://`, los analiza
 * con ffprobe y consulta su vista previa. Solo se llama con rutas que decide el main
 * (diálogo, historial y cola), nunca con una ruta que mande el renderer.
 */
export class MediaOpener {
  constructor(
    private readonly registry: MediaRegistry,
    private readonly tools: Pick<MediaTools, 'probe'>,
    private readonly previews: PreviewService,
    private readonly dialogs: Dialogs,
    private readonly log: Logger
  ) {}

  async open(filePath: string): Promise<OpenedMedia> {
    const id = this.registry.register(filePath)
    const info = await this.tools.probe(filePath).catch((err) => {
      // Sin probe el `<video>` lo intenta igual; el error real sale al transcribir.
      this.log.warn(`probe falló para ${filePath}`, err)
      return null
    })
    const preview = await this.previews.statusFor(filePath, id, info).catch((err) => {
      this.log.warn(`No se pudo consultar la vista previa de ${filePath}`, err)
      return { state: 'none' } as const
    })
    return { id, filePath, fileName: basename(filePath), info, preview }
  }

  /** Diálogo para elegir un solo archivo ("Buscar archivo..."); `null` si se cancela. */
  async pickOne(
    owner: DialogOwner,
    filterLabels: Record<MediaFilterKey, string>
  ): Promise<OpenedMedia | null> {
    const [filePath] = await this.dialogs.pickMediaFiles(owner, filterLabels, false)
    return filePath ? this.open(filePath) : null
  }

  /** Diálogo con selección múltiple ("Abrir archivo" y la cola); `[]` si se cancela. */
  pickMany(owner: DialogOwner, filterLabels: Record<MediaFilterKey, string>): Promise<string[]> {
    return this.dialogs.pickMediaFiles(owner, filterLabels, true)
  }
}
