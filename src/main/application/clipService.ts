import { dirname, join } from 'path'
import type { ClipResult, QueueAddResult } from '@shared/types'
import {
  clipArgs,
  clipExtension,
  clipFileName,
  isValidClipRange,
  WAVEFORM_BARS,
  type ClipMode
} from '../domain/clip'
import { isValidHistoryId } from '../domain/history'
import { isSafeMediaPath } from '../domain/mediaRegistry'
import type { Clipper } from './ports/clipper'
import type { Disk } from './ports/disk'
import type { Logger } from './ports/eventPublisher'
import type { HistoryRepository } from './ports/historyRepository'
import type { MediaTools } from './ports/mediaTools'
import type { Shell } from './ports/shell'

/** Copias con el mismo tramo que se aceptan antes de rendirse buscando un nombre libre. */
const MAX_COPIES = 99

export interface ClipServiceDeps {
  history: HistoryRepository
  media: Pick<MediaTools, 'probe'>
  clipper: Clipper
  disk: Disk
  shell: Shell
  log: Logger
  /** Mete el recorte en la cola (`QueueIntake.addPaths`). */
  enqueue: (paths: string[]) => Promise<QueueAddResult>
}

/**
 * "Recortar" (tarea 39): guarda un tramo del archivo de una entrada junto al original, con el
 * tramo en el nombre. Primero copia las pistas tal cual; si el contenedor no se deja, recodifica.
 */
export class ClipService {
  /** Recortes escritos en esta sesión: los únicos que "Mostrar en el Explorador" acepta. */
  private readonly written = new Set<string>()
  /** Formas de onda calculadas (o calculándose) en esta sesión, por ruta. */
  private readonly waveforms = new Map<string, Promise<number[] | null>>()

  constructor(private readonly deps: ClipServiceDeps) {}

  /** `clip:cut`: la ruta sale del historial, no del renderer. */
  async cut(
    entryId: unknown,
    start: unknown,
    end: unknown,
    transcribe: unknown
  ): Promise<ClipResult> {
    const { history, media, disk, log } = this.deps
    if (!isValidHistoryId(entryId)) return { status: 'missing' }
    const saved = await history.get(entryId)
    const filePath = saved?.entry.filePath
    if (!saved || !filePath || !isSafeMediaPath(filePath) || !(await disk.exists(filePath))) {
      return { status: 'missing' }
    }
    const info = await media.probe(filePath).catch(() => null)
    const duration = info?.durationSec || saved.entry.durationSec
    const from = Number(start)
    // El final no pasa de la duración: así el nombre dice el tramo que de verdad tiene.
    const to = duration > 0 ? Math.min(Number(end), duration) : Number(end)
    if (!isValidClipRange(from, to, duration)) return { status: 'invalid' }
    const hasVideo = Boolean(info?.videoCodec)

    for (const mode of ['copy', 'encode'] as const satisfies readonly ClipMode[]) {
      const out = await this.freePath(filePath, saved.entry.fileName, from, to, mode, hasVideo)
      if (!out) return { status: 'failed' }
      try {
        await this.deps.clipper.run(clipArgs(filePath, out, from, to, mode, hasVideo), out)
      } catch (err) {
        log.warn(`Recorte (${mode}) falló: ${filePath}`, err)
        continue
      }
      this.written.add(out)
      log.info(`Recorte guardado: ${out}`)
      const queued = transcribe === true && (await this.deps.enqueue([out])).added > 0
      return { status: 'saved', path: out, queued }
    }
    return { status: 'failed' }
  }

  /**
   * `clip:waveform`: picos del audio para el diálogo "Recortar", o `null` si no se pudo. Se
   * guardan por ruta mientras dure la sesión: abrir el diálogo otra vez es instantáneo.
   */
  async waveform(entryId: unknown): Promise<number[] | null> {
    const { history, media, disk, log } = this.deps
    if (!isValidHistoryId(entryId)) return null
    const saved = await history.get(entryId)
    const filePath = saved?.entry.filePath
    if (!saved || !filePath || !isSafeMediaPath(filePath) || !(await disk.exists(filePath))) {
      return null
    }
    let pending = this.waveforms.get(filePath)
    if (!pending) {
      pending = (async () => {
        const info = await media.probe(filePath).catch(() => null)
        const duration = info?.durationSec || saved.entry.durationSec
        if (!(duration > 0)) return null
        return this.deps.clipper.waveform(filePath, duration, WAVEFORM_BARS)
      })().catch((err: unknown) => {
        log.warn(`Forma de onda falló: ${filePath}`, err)
        this.waveforms.delete(filePath)
        return null
      })
      this.waveforms.set(filePath, pending)
    }
    return pending
  }

  /** `clip:showInFolder`: solo recortes escritos en esta sesión. */
  showInFolder(path: unknown): void {
    if (typeof path === 'string' && this.written.has(path)) this.deps.shell.showItemInFolder(path)
  }

  /** Primera ruta libre para el recorte junto al original; `null` si no queda ninguna. */
  private async freePath(
    filePath: string,
    fileName: string,
    start: number,
    end: number,
    mode: ClipMode,
    hasVideo: boolean
  ): Promise<string | null> {
    const extension = clipExtension(fileName, mode, hasVideo)
    for (let copy = 1; copy <= MAX_COPIES; copy++) {
      const path = join(dirname(filePath), clipFileName(fileName, start, end, extension, copy))
      if (!(await this.deps.disk.exists(path))) return path
    }
    return null
  }
}
