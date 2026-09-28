import { open, rename, stat, statfs, unlink } from 'fs/promises'

// Núcleo de la descarga de modelos, sin Electron: se prueba con Vitest contra un servidor local.
// `services/models.ts` le pasa `net.fetch` y las rutas de `userData`.

export const PROGRESS_INTERVAL_MS = 250
/** Ventana de la media móvil de la velocidad. */
const SPEED_WINDOW_MS = 5_000

export interface DownloadProgress {
  received: number
  total: number
  bytesPerSec: number
  etaSec: number | null
}

export interface DownloadOptions {
  url: string
  /** Ruta final del `.bin`; se descarga en `<dest>.part` y se renombra al terminar. */
  dest: string
  expectedSize: number
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  now?: () => number
}

export class DownloadError extends Error {
  constructor(
    readonly code: 'downloadFailed' | 'sizeMismatch',
    message: string
  ) {
    super(message)
    this.name = 'DownloadError'
  }
}

export function partPath(dest: string): string {
  return `${dest}.part`
}

export async function fileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

/** Velocidad como media móvil sobre los últimos `windowMs`. */
export class SpeedMeter {
  private samples: { t: number; bytes: number }[] = []

  constructor(private readonly windowMs = SPEED_WINDOW_MS) {}

  add(t: number, bytes: number): void {
    this.samples.push({ t, bytes })
    // Se conserva una muestra anterior a la ventana para que siempre haya un intervalo que medir.
    while (this.samples.length > 2 && t - this.samples[1].t >= this.windowMs) this.samples.shift()
  }

  bytesPerSec(): number {
    if (this.samples.length < 2) return 0
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    const dt = (last.t - first.t) / 1000
    return dt > 0 ? (last.bytes - first.bytes) / dt : 0
  }
}

/** `Content-Range: bytes 100-199/200` → 100. */
export function contentRangeStart(header: string | null): number | null {
  const match = header?.match(/^bytes (\d+)-\d+\/(?:\d+|\*)$/)
  return match ? Number(match[1]) : null
}

/**
 * Descarga `url` en `<dest>.part` y la renombra a `dest` si el tamaño final coincide.
 * - Si ya hay un `.part`, pide `Range: bytes=<tamaño>-`. Con `206` sigue; con `200` (el servidor
 *   ignoró el Range) empieza de cero; con `416` borra el `.part` y reintenta sin Range.
 * - Al cancelar (`signal`) rechaza con el `AbortError` y conserva el `.part`.
 * - Si la conexión se corta, lanza `DownloadError('downloadFailed')` y conserva el `.part`.
 * - Si el archivo queda más grande de lo esperado, borra el `.part` y lanza
 *   `DownloadError('sizeMismatch')`.
 */
export async function downloadWithResume(options: DownloadOptions): Promise<void> {
  try {
    await download(options)
  } catch (err) {
    if (err instanceof DownloadError || signalAborted(options.signal, err)) throw err
    // Errores de red de fetch o del cuerpo ("fetch failed", "terminated", ECONNRESET...).
    throw new DownloadError('downloadFailed', err instanceof Error ? err.message : String(err))
  }
}

function signalAborted(signal: AbortSignal | undefined, err: unknown): boolean {
  return signal?.aborted === true || (err instanceof Error && err.name === 'AbortError')
}

async function download(options: DownloadOptions): Promise<void> {
  const { url, dest, expectedSize, signal, onProgress } = options
  const doFetch = options.fetch ?? ((u: string, init: RequestInit) => globalThis.fetch(u, init))
  const now = options.now ?? Date.now
  const part = partPath(dest)

  let offset = await fileSize(part)
  if (offset > expectedSize) {
    await unlink(part)
    offset = 0
  }

  if (offset < expectedSize) {
    let response = await doFetch(url, {
      headers: offset > 0 ? { Range: `bytes=${offset}-` } : {},
      redirect: 'follow',
      signal
    })
    if (response.status === 416 && offset > 0) {
      await response.body?.cancel()
      await unlink(part)
      offset = 0
      response = await doFetch(url, { redirect: 'follow', signal })
    }

    if (response.status === 200) {
      offset = 0
    } else if (response.status === 206) {
      const start = contentRangeStart(response.headers.get('content-range'))
      if (start !== offset) {
        await response.body?.cancel()
        throw new DownloadError('downloadFailed', `Content-Range inesperado (${start} ≠ ${offset})`)
      }
    } else {
      await response.body?.cancel()
      throw new DownloadError('downloadFailed', `HTTP ${response.status} al descargar ${url}`)
    }
    if (!response.body) throw new DownloadError('downloadFailed', 'Respuesta sin cuerpo')

    await writeBody(response.body, part, offset, {
      total: expectedSize,
      onProgress,
      now
    })
  }

  const size = await fileSize(part)
  if (size < expectedSize) {
    // La conexión se cerró antes de tiempo: el .part se conserva para reanudar.
    throw new DownloadError('downloadFailed', `Descarga incompleta (${size} de ${expectedSize})`)
  }
  if (size !== expectedSize) {
    await unlink(part).catch(() => {})
    throw new DownloadError('sizeMismatch', `Tamaño ${size} ≠ ${expectedSize} esperado`)
  }
  await rename(part, dest)
}

async function writeBody(
  body: ReadableStream<Uint8Array>,
  part: string,
  offset: number,
  {
    total,
    onProgress,
    now
  }: { total: number; onProgress?: (p: DownloadProgress) => void; now: () => number }
): Promise<void> {
  // 'a' sigue donde quedó el .part; 'w' lo trunca cuando se empieza de cero.
  const file = await open(part, offset > 0 ? 'a' : 'w')
  const meter = new SpeedMeter()
  let received = offset
  let lastEmit = -Infinity

  const emit = (): void => {
    const bytesPerSec = meter.bytesPerSec()
    const etaSec = bytesPerSec > 0 ? Math.max(0, (total - received) / bytesPerSec) : null
    onProgress?.({ received, total, bytesPerSec, etaSec })
  }

  try {
    meter.add(now(), received)
    // Si se cancela, la lectura del cuerpo rechaza con AbortError y el .part queda como está.
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      await file.write(chunk)
      received += chunk.byteLength
      const t = now()
      meter.add(t, received)
      if (t - lastEmit >= PROGRESS_INTERVAL_MS) {
        lastEmit = t
        emit()
      }
    }
    emit()
  } finally {
    await file.close()
  }
}

/** Bytes libres en el disco de `dir` para el usuario actual. */
export async function freeDiskSpace(dir: string): Promise<number> {
  const stats = await statfs(dir)
  return stats.bavail * stats.bsize
}

/** Magic de los modelos GGML de whisper.cpp: `0x67676d6c` ("ggml") en little-endian. */
const GGML_MAGIC = 0x67676d6c

/** Validación básica de un modelo personalizado: la cabecera empieza con el magic GGML. */
export async function hasGgmlHeader(path: string): Promise<boolean> {
  let file: Awaited<ReturnType<typeof open>> | undefined
  try {
    file = await open(path, 'r')
    const buffer = Buffer.alloc(4)
    const { bytesRead } = await file.read(buffer, 0, 4, 0)
    return bytesRead === 4 && buffer.readUInt32LE(0) === GGML_MAGIC
  } catch {
    return false
  } finally {
    await file?.close()
  }
}
