import { randomUUID } from 'crypto'
import { readdir, rm } from 'fs/promises'
import { join } from 'path'
import { editSegment } from '@shared/editSegment'
import { normalize } from '@shared/normalize'
import type { HistoryEntry, Segment } from '@shared/types'
import type { HistoryRepository } from '../../application/ports/historyRepository'
import { isRecord } from '../../domain/guards'
import {
  isHistoryEntry,
  isSegment,
  isValidHistoryId,
  persistedEntry,
  restoreEntry,
  type HistoryPatch,
  type NewHistoryEntry
} from '../../domain/history'
import { DebouncedJsonWriter, readJsonSafe } from './fsAtomic'

/**
 * Adaptador del historial sobre archivos JSON en `userData/history/` (spec §5), sin Electron:
 * - `index.json`: `{ version, entries: HistoryEntry[] }`
 * - `<id>.json`: `{ segments: Segment[] }`
 * Todo pasa por memoria y se escribe con debounce; `create`, `remove` y `clear` escriben al momento.
 */

const INDEX_VERSION = 1

interface IndexFile {
  version: number
  entries: HistoryEntry[]
}

interface SegmentsFile {
  segments: Segment[]
}

export interface JsonHistoryRepositoryOptions {
  dir: string
  debounceMs?: number
  onCorrupt?: (backupPath: string, error: unknown) => void
}

export class JsonHistoryRepository implements HistoryRepository {
  private entries: HistoryEntry[] | null = null
  private loading: Promise<void> | null = null
  private readonly indexWriter: DebouncedJsonWriter
  /** Segmentos en memoria de las entradas que se tocaron en esta sesión. */
  private readonly segments = new Map<string, Promise<Segment[]>>()
  private readonly segmentWriters = new Map<string, DebouncedJsonWriter>()

  constructor(private readonly options: JsonHistoryRepositoryOptions) {
    this.indexWriter = new DebouncedJsonWriter(this.indexPath, this.debounceMs)
  }

  private get debounceMs(): number {
    return this.options.debounceMs ?? 500
  }

  private get indexPath(): string {
    return join(this.options.dir, 'index.json')
  }

  private segmentsPath(id: string): string {
    return join(this.options.dir, `${id}.json`)
  }

  private async load(): Promise<HistoryEntry[]> {
    this.loading ??= (async () => {
      const raw = await readJsonSafe<unknown>(this.indexPath, null, this.options.onCorrupt)
      const list = isRecord(raw) && Array.isArray(raw.entries) ? raw.entries : []
      this.entries = list.filter(isHistoryEntry).map(restoreEntry)
    })().catch((err) => {
      this.loading = null
      throw err
    })
    await this.loading
    return this.entries!
  }

  private scheduleIndex(): void {
    this.indexWriter.schedule((): IndexFile => ({
      version: INDEX_VERSION,
      entries: (this.entries ?? []).map(persistedEntry)
    }))
  }

  private async writeIndexNow(): Promise<void> {
    this.scheduleIndex()
    await this.indexWriter.flush()
  }

  private writerFor(id: string): DebouncedJsonWriter {
    let writer = this.segmentWriters.get(id)
    if (!writer) {
      writer = new DebouncedJsonWriter(this.segmentsPath(id), this.debounceMs)
      this.segmentWriters.set(id, writer)
    }
    return writer
  }

  private async readSegments(id: string): Promise<Segment[]> {
    const raw = await readJsonSafe<unknown>(this.segmentsPath(id), null, this.options.onCorrupt)
    return isRecord(raw) && Array.isArray(raw.segments) ? raw.segments.filter(isSegment) : []
  }

  /** Segmentos en memoria (se leen de disco la primera vez). El array se modifica en el sitio. */
  private segmentsOf(id: string): Promise<Segment[]> {
    let segments = this.segments.get(id)
    if (!segments) {
      segments = this.readSegments(id)
      this.segments.set(id, segments)
    }
    return segments
  }

  private async scheduleSegments(id: string): Promise<void> {
    const segments = await this.segmentsOf(id)
    this.writerFor(id).schedule((): SegmentsFile => ({ segments }))
  }

  /** Entradas, de la más nueva a la más vieja. */
  async list(): Promise<HistoryEntry[]> {
    const entries = await this.load()
    return [...entries].sort((a, b) => b.createdAt - a.createdAt)
  }

  async get(id: string): Promise<{ entry: HistoryEntry; segments: Segment[] } | null> {
    const entry = (await this.load()).find((e) => e.id === id)
    if (!entry) return null
    return { entry: { ...entry }, segments: [...(await this.segmentsOf(id))] }
  }

  async create(input: NewHistoryEntry): Promise<HistoryEntry> {
    const entries = await this.load()
    const id = input.id ?? randomUUID()
    if (!isValidHistoryId(id)) throw new Error(`Id de historial inválido: ${id}`)
    if (entries.some((e) => e.id === id)) throw new Error(`Ya existe la entrada ${id}`)
    const entry: HistoryEntry = {
      ...input,
      id,
      createdAt: input.createdAt ?? Date.now(),
      status: input.status ?? 'pending'
    }
    entries.push(entry)
    this.segments.set(id, Promise.resolve([]))
    await this.writeIndexNow()
    return { ...entry }
  }

  /** Cambia campos de una entrada (guardado con debounce). `null` si no existe. */
  async update(id: string, patch: HistoryPatch): Promise<HistoryEntry | null> {
    const entry = (await this.load()).find((e) => e.id === id)
    if (!entry) return null
    Object.assign(entry, patch, { id })
    this.scheduleIndex()
    return { ...entry }
  }

  /** Añade segmentos al final (durante la transcripción). Ignora ids que ya no existen. */
  async appendSegments(id: string, segments: Segment[]): Promise<void> {
    if (!(await this.load()).some((e) => e.id === id)) return
    ;(await this.segmentsOf(id)).push(...segments)
    await this.scheduleSegments(id)
  }

  /** Reemplaza todos los segmentos (al empezar de nuevo, al terminar o al editar). */
  async setSegments(id: string, segments: Segment[]): Promise<void> {
    if (!(await this.load()).some((e) => e.id === id)) return
    const current = await this.segmentsOf(id)
    current.splice(0, current.length, ...segments)
    await this.scheduleSegments(id)
  }

  /**
   * Cambia el texto de un segmento y guarda el de whisper en `originalText` para poder
   * restaurarlo. Volver al texto original quita las marcas. `null` si no existe.
   */
  async updateSegment(id: string, index: number, text: string): Promise<Segment | null> {
    if (!(await this.load()).some((e) => e.id === id)) return null
    const segments = await this.segmentsOf(id)
    const current = segments[index]
    if (!current) return null
    const next = editSegment(current, text)
    segments[index] = next
    await this.scheduleSegments(id)
    return { ...next }
  }

  /** Ids de las entradas cuya transcripción contiene `query` (sin mayúsculas ni tildes). */
  async search(query: string): Promise<string[]> {
    const needle = normalize(query.trim())
    if (!needle) return []
    const entries = await this.load()
    const matches = await Promise.all(
      entries.map(async (e) => {
        const segments = await this.segmentsOf(e.id)
        return segments.some((s) => normalize(s.text).includes(needle)) ? e.id : null
      })
    )
    return matches.filter((id): id is string => id !== null)
  }

  async remove(id: string): Promise<boolean> {
    const entries = await this.load()
    const index = entries.findIndex((e) => e.id === id)
    if (index === -1) return false
    entries.splice(index, 1)
    await this.dropSegments(id)
    await this.writeIndexNow()
    return true
  }

  /**
   * Borra todo el historial. Solo toca archivos de la carpeta del historial: nunca los
   * medios originales ni los .srt exportados (spec §5).
   */
  async clear(): Promise<void> {
    await this.load()
    this.entries = []
    this.indexWriter.cancel()
    await this.indexWriter.flush() // una escritura en curso no debe resucitar el índice
    await Promise.all([...this.segmentWriters.keys()].map((id) => this.dropSegments(id)))
    this.segments.clear()
    let files: string[] = []
    try {
      files = await readdir(this.options.dir)
    } catch {
      // Sin carpeta no hay nada que borrar.
    }
    await Promise.all(
      files
        .filter((f) => /\.json(\.tmp|\.corrupt-[\w-]+)?$/.test(f))
        .map((f) => rm(join(this.options.dir, f), { force: true }))
    )
  }

  private async dropSegments(id: string): Promise<void> {
    const writer = this.segmentWriters.get(id)
    if (writer) {
      writer.cancel()
      await writer.flush() // espera una escritura que ya estuviera en curso
      this.segmentWriters.delete(id)
    }
    this.segments.delete(id)
    await rm(this.segmentsPath(id), { force: true })
  }

  /** Escribe ya todo lo pendiente. */
  async flush(): Promise<void> {
    await Promise.all([
      this.indexWriter.flush(),
      ...[...this.segmentWriters.values()].map((w) => w.flush())
    ])
  }
}
