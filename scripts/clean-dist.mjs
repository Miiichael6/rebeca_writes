// Vacía `dist/` antes de compilar para que no se acumulen instaladores de versiones viejas
// (~130 MB cada uno; las publicadas ya están en GitHub Releases). Se ejecuta en `build:win`
// y `release`. Deja lo que no genera electron-builder, como `prueba-limpia.wsb` (Sandbox).

import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '..', 'dist')
/** Archivos propios que viven en `dist/` y no se borran. */
const KEEP = /\.wsb$/i

if (existsSync(DIST)) {
  const removed = readdirSync(DIST).filter((name) => !KEEP.test(name))
  for (const name of removed) rmSync(join(DIST, name), { recursive: true, force: true })
  console.log(`dist/: ${removed.length} elementos borrados`)
}
