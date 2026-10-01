import { resolve } from 'path'

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
