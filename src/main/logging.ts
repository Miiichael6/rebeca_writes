import { existsSync, renameSync, rmSync } from 'fs'
import { join, parse } from 'path'
import { app } from 'electron'
import log from 'electron-log/main'

/** Logs rotativos en `userData/logs/` (spec §5): `main.log` + 2 archivos viejos de ~5 MB. */

const MAX_SIZE_BYTES = 5 * 1024 * 1024
/** Archivos viejos que se conservan además del actual (3 en total). */
const ARCHIVES = 2

export function logsDir(): string {
  return join(app.getPath('userData'), 'logs')
}

/** `main.log` → `main.1.log` → `main.2.log`; el más viejo se descarta. */
function rotate(path: string): void {
  const { dir, name, ext } = parse(path)
  const archive = (n: number): string => join(dir, `${name}.${n}${ext}`)
  try {
    rmSync(archive(ARCHIVES), { force: true })
    for (let n = ARCHIVES - 1; n >= 1; n--) {
      if (existsSync(archive(n))) renameSync(archive(n), archive(n + 1))
    }
    renameSync(path, archive(1))
  } catch (err) {
    // electron-log sigue escribiendo en el mismo archivo si no se pudo rotar.
    console.warn('No se pudo rotar el log', err)
  }
}

/** Se llama lo antes posible en el main, antes de cualquier `log.*`. */
export function setupLogging(): void {
  log.transports.file.resolvePathFn = () => join(logsDir(), 'main.log')
  log.transports.file.maxSize = MAX_SIZE_BYTES
  log.transports.file.archiveLogFn = (file) => rotate(file.path)
  // Excepciones y promesas rechazadas sin capturar: al log, sin diálogo.
  log.errorHandler.startCatching({ showDialog: false })
  log.info(`Inicio ${app.getName()} v${app.getVersion()} (${process.platform} ${process.arch})`)
}
