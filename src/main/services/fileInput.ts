import { readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { hasMediaExtension } from '@shared/formats'

/**
 * Entrada de archivos (tarea 19): lo que llega por drag & drop o por "Abrir con" se
 * convierte en la lista de archivos que va a la cola. Sin Electron, para poder probarlo.
 */

export interface ExpandedPaths {
  /** Archivos a encolar, sin repetidos, en el orden en que llegaron. */
  files: string[]
  /** Archivos de las carpetas que no tienen extensión de audio o video. */
  ignored: number
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare

/**
 * Archivos sueltos: se aceptan todos (una extensión desconocida se intenta igual con ffprobe
 * y, si no hay audio, el trabajo termina con un error claro). Carpetas: se recorren con sus
 * subcarpetas y solo se quedan los archivos con extensión admitida. Las rutas que no existen
 * se descartan sin contarlas. Todo es asíncrono: una carpeta enorme no bloquea el main.
 */
export async function expandPaths(paths: readonly string[]): Promise<ExpandedPaths> {
  const files: string[] = []
  const seen = new Set<string>()
  let ignored = 0
  const push = (file: string): void => {
    const key = file.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }

  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    entries.sort((a, b) => byName(a.name, b.name))
    // Primero los archivos de la carpeta y después sus subcarpetas, como en el Explorador.
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (hasMediaExtension(entry.name)) push(join(dir, entry.name))
      else ignored++
    }
    // Los enlaces simbólicos no son `isDirectory()`: así no hay ciclos.
    for (const entry of entries) {
      if (entry.isDirectory()) await walk(join(dir, entry.name))
    }
  }

  for (const path of paths) {
    const full = resolve(path)
    const info = await stat(full).catch(() => null)
    if (info?.isDirectory()) await walk(full)
    else if (info?.isFile()) push(full)
  }
  return { files, ignored }
}

/**
 * Rutas de la línea de comandos ("Abrir con", arrastrar al ícono), absolutas respecto a
 * `cwd`. `argv[0]` es el exe y las opciones (`--algo`) se saltan. Sin empaquetar, la carpeta
 * de la app (`appPath`) también llega como argumento, y no siempre en la misma posición
 * (Chromium mete sus opciones delante): se descarta por ruta, no por posición.
 */
export function pathsFromArgv(argv: readonly string[], cwd: string, appPath: string): string[] {
  const app = resolve(appPath).toLowerCase()
  return argv
    .slice(1)
    .filter((arg) => arg !== '' && !arg.startsWith('-'))
    .map((arg) => resolve(cwd, arg))
    .filter((path) => path.toLowerCase() !== app)
}
