import { basename, dirname, join } from 'path'
import { SPEAKER_NAME_MAX } from '@shared/speakers'
import type {
  HistoryEntry,
  HistoryEntryInput,
  HistoryOpened,
  OpenedMedia,
  RenameFileResult,
  Segment
} from '@shared/types'
import { isValidHistoryId, renamedFileName } from '../domain/history'
import { renamedSpeakers } from '../domain/speakers/speakerNames'
import type { HistoryMedia } from './ports/historyMedia'
import type { HistoryRepository } from './ports/historyRepository'

/**
 * Casos de uso del historial, sin Electron. Los argumentos llegan del renderer (`unknown`),
 * así que se validan aquí. Diálogos y ventanas quedan fuera: `relocate` recibe `pickMedia`.
 */
export class HistoryService {
  constructor(
    private readonly repo: HistoryRepository,
    private readonly media: HistoryMedia
  ) {}

  create(input: unknown): Promise<HistoryEntry> {
    const i = (input ?? {}) as Partial<Record<keyof HistoryEntryInput, unknown>>
    const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0
    if (!text(i.filePath) || !text(i.fileName) || !text(i.model) || !text(i.language)) {
      return Promise.reject(new Error('Entrada de historial inválida'))
    }
    const duration = Number(i.durationSec)
    return this.repo.create({
      filePath: i.filePath,
      fileName: i.fileName,
      model: i.model,
      language: i.language,
      durationSec: Number.isFinite(duration) && duration > 0 ? duration : 0
    })
  }

  /** Edición en línea de un segmento (tarea 16). */
  async updateSegment(id: unknown, index: unknown, text: unknown): Promise<Segment | null> {
    if (!isValidHistoryId(id) || !Number.isInteger(index) || typeof text !== 'string') {
      throw new Error('Edición de segmento inválida')
    }
    return this.repo.updateSegment(id, index as number, text)
  }

  list(): Promise<HistoryEntry[]> {
    return this.repo.list()
  }

  /**
   * Entrada y segmentos. El archivo solo se registra en `media://` si sigue en su ruta; si
   * no, `media` es `null` y el renderer muestra el aviso "no disponible".
   */
  async get(id: unknown): Promise<HistoryOpened | null> {
    if (!isValidHistoryId(id)) return null
    const saved = await this.repo.get(id)
    if (!saved) return null
    const { filePath, live } = saved.entry
    // En vivo, `filePath` es el `.pcm` que crece (tarea 27): no se reproduce hasta `--live-media`.
    const media =
      !live && this.media.isSafePath(filePath) && (await this.media.exists(filePath))
        ? await this.media.open(filePath)
        : null
    return { ...saved, media }
  }

  search(query: unknown): Promise<string[]> {
    return typeof query === 'string' ? this.repo.search(query) : Promise.resolve([])
  }

  /** Solo el nombre mostrado; el archivo no se toca. */
  async rename(id: unknown, displayName: unknown): Promise<HistoryEntry | null> {
    if (!isValidHistoryId(id) || typeof displayName !== 'string') return null
    const trimmed = displayName.trim()
    return this.repo.update(id, { displayName: trimmed || undefined })
  }

  /**
   * Renombra el archivo original en su carpeta (conserva la extensión) y la entrada pasa a
   * mostrar ese nombre. Las demás entradas del mismo archivo también apuntan a la ruta nueva.
   * No se toca mientras está en la cola o grabándose: el trabajo usa la ruta vieja.
   */
  async renameFile(id: unknown, name: unknown): Promise<RenameFileResult> {
    if (!isValidHistoryId(id) || typeof name !== 'string') return { ok: false, reason: 'invalid' }
    const saved = await this.repo.get(id)
    if (!saved) return { ok: false, reason: 'missing' }
    const from = saved.entry.filePath
    const fileName = renamedFileName(basename(from), name)
    if (!fileName) return { ok: false, reason: 'invalid' }
    const entries = await this.repo.list()
    const sharing = entries.filter((e) => e.filePath === from)
    if (sharing.some((e) => e.live || e.status === 'pending' || e.status === 'transcribing')) {
      return { ok: false, reason: 'busy' }
    }
    if (!this.media.isSafePath(from) || !(await this.media.exists(from))) {
      return { ok: false, reason: 'missing' }
    }
    const to = join(dirname(from), fileName)
    // Windows no distingue mayúsculas: cambiar solo eso no choca consigo mismo.
    const sameFile = to.toLowerCase() === from.toLowerCase()
    if (!sameFile && (await this.media.exists(to))) return { ok: false, reason: 'exists' }
    if (to !== from) {
      try {
        await this.media.rename(from, to)
      } catch {
        return { ok: false, reason: 'failed' }
      }
      this.media.unregister(from)
    }
    for (const other of sharing) {
      if (other.id !== id) await this.repo.update(other.id, { filePath: to, fileName })
    }
    const entry = await this.repo.update(id, { filePath: to, fileName, displayName: undefined })
    if (!entry) return { ok: false, reason: 'missing' }
    return { ok: true, entry, media: await this.media.open(to) }
  }

  /** Nombre de un hablante (tarea 35); vacío vuelve al de por defecto ("Persona 1"). */
  async renameSpeaker(
    id: unknown,
    speakerId: unknown,
    name: unknown
  ): Promise<HistoryEntry | null> {
    if (!isValidHistoryId(id) || typeof speakerId !== 'string' || typeof name !== 'string') {
      return null
    }
    const saved = await this.repo.get(id)
    if (!saved) return null
    const speakers = renamedSpeakers(saved.entry.speakers, speakerId, name, SPEAKER_NAME_MAX)
    return this.repo.update(id, { speakers })
  }

  /** Quita la entrada y saca su archivo de la lista blanca de `media://`. */
  async remove(id: unknown): Promise<boolean> {
    if (!isValidHistoryId(id)) return false
    const saved = await this.repo.get(id)
    if (!saved) return false
    const removed = await this.repo.remove(id)
    if (removed) this.media.unregister(saved.entry.filePath)
    return removed
  }

  /**
   * Borra `index.json`, los `<id>.json` y la caché de vistas previas. Los medios originales
   * y los .srt exportados no se tocan (spec §5).
   */
  async clear(): Promise<void> {
    const entries = await this.repo.list()
    await this.repo.clear()
    for (const entry of entries) this.media.unregister(entry.filePath)
    await this.media.clearPreviewCache()
  }

  /** "Buscar archivo..." para una entrada cuyo original se movió. */
  async relocate(
    id: unknown,
    pickMedia: () => Promise<OpenedMedia | null>
  ): Promise<{ entry: HistoryEntry; media: OpenedMedia } | null> {
    if (!isValidHistoryId(id) || !(await this.repo.get(id))) return null
    const media = await pickMedia()
    if (!media) return null
    const entry = await this.repo.update(id, {
      filePath: media.filePath,
      fileName: basename(media.filePath),
      ...(media.info ? { durationSec: media.info.durationSec } : {})
    })
    return entry ? { entry, media } : null
  }

  /** La ruta sale del historial, no del renderer. */
  async showInFolder(id: unknown): Promise<void> {
    const saved = isValidHistoryId(id) ? await this.repo.get(id) : null
    if (saved && this.media.isSafePath(saved.entry.filePath)) {
      this.media.showInFolder(saved.entry.filePath)
    }
  }
}
