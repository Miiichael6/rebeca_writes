import { mkdir, open, readFile, rename, rm } from 'fs/promises'
import { dirname } from 'path'

/**
 * Persistencia JSON sin riesgo de corrupción (spec §5). Sin dependencias de Electron para
 * poder probarlo con una carpeta temporal.
 */

/** En Windows un antivirus o el indexador pueden tener el destino abierto un instante. */
const RENAME_RETRIES = 5
const RENAME_RETRY_MS = 50
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY'])

/** Escrituras en curso por ruta: la siguiente espera a la anterior. */
const chains = new Map<string, Promise<void>>()

function errorCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException | null)?.code
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to)
      return
    } catch (err) {
      if (attempt >= RENAME_RETRIES || !RETRYABLE.has(errorCode(err) ?? '')) throw err
      await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_MS * (attempt + 1)))
    }
  }
}

async function writeNow(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  const handle = await open(tmp, 'w')
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), 'utf8')
    // Sin fsync, un corte de luz puede dejar el rename hecho y el contenido aún sin escribir.
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await renameWithRetry(tmp, path)
  } catch (err) {
    await rm(tmp, { force: true })
    throw err
  }
}

/**
 * Escribe `<path>.tmp`, hace fsync y lo renombra sobre `path`: en disco siempre queda el
 * archivo anterior entero o el nuevo entero. Las escrituras a la misma ruta van en orden.
 */
export function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  const previous = chains.get(path) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(() => writeNow(path, data))
  chains.set(path, next)
  const cleanup = (): void => {
    if (chains.get(path) === next) chains.delete(path)
  }
  next.then(cleanup, cleanup)
  return next
}

/** `2026-09-28T10-15-00-000Z`: fecha válida como parte de un nombre de archivo en Windows. */
function fileStamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

/**
 * Lee un JSON. Si no existe devuelve `fallback`; si está corrupto lo aparta como
 * `<path>.corrupt-<fecha>` (para no pisarlo en la próxima escritura) y devuelve `fallback`.
 * `onCorrupt` recibe la ruta del respaldo, para el log.
 */
export async function readJsonSafe<T>(
  path: string,
  fallback: T,
  onCorrupt?: (backupPath: string, error: unknown) => void
): Promise<T> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return fallback
    throw err
  }
  try {
    // Un BOM al principio (p. ej. si alguien lo editó con el Bloc de notas) no es corrupción.
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text) as T
  } catch (err) {
    const backup = `${path}.corrupt-${fileStamp(new Date())}`
    await renameWithRetry(path, backup).catch(() => {})
    onCorrupt?.(backup, err)
    return fallback
  }
}

/** Escritores con debounce que aún no escribieron: se vacían todos al salir. */
const pendingWriters = new Set<DebouncedJsonWriter>()

/**
 * Agrupa escrituras seguidas al mismo archivo: `schedule` guarda la última versión y la
 * escribe `delayMs` después del último cambio. `getData` se llama al escribir, así se
 * serializa el estado más reciente.
 */
export class DebouncedJsonWriter {
  private timer: NodeJS.Timeout | null = null
  private getData: (() => unknown) | null = null

  constructor(
    readonly path: string,
    private readonly delayMs: number
  ) {}

  schedule(getData: () => unknown): void {
    this.getData = getData
    pendingWriters.add(this)
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush().catch(() => {}), this.delayMs)
  }

  /** Escribe ya lo pendiente (si hay) y espera a que termine cualquier escritura en curso. */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const getData = this.getData
    this.getData = null
    pendingWriters.delete(this)
    if (getData) await writeJsonAtomic(this.path, getData())
    else await (chains.get(this.path) ?? Promise.resolve())
  }

  /** Olvida lo pendiente sin escribirlo (p. ej. se va a borrar el archivo). */
  cancel(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.getData = null
    pendingWriters.delete(this)
  }

  get pending(): boolean {
    return this.getData !== null
  }
}

/** ¿Queda algo por escribir o escribiéndose? */
export function hasPendingWrites(): boolean {
  return pendingWriters.size > 0 || chains.size > 0
}

/** Vacía todos los escritores con debounce y espera las escrituras en curso (al salir). */
export async function flushAllWrites(): Promise<void> {
  await Promise.allSettled([...pendingWriters].map((w) => w.flush()))
  await Promise.allSettled([...chains.values()])
}
