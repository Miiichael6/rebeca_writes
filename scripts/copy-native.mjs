// Copia el sidecar de captura (rl-capture.exe, tarea 29) compilado en release a resources/bin/,
// desde donde main lo lanza y electron-builder lo empaqueta fuera del asar (asarUnpack: resources/**).
import { copyFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BINARY = 'rl-capture.exe'
const ROOT = resolve(import.meta.dirname, '..')
const source = join(ROOT, 'native', 'target', 'release', BINARY)
const destinationDir = join(ROOT, 'resources', 'bin')

mkdirSync(destinationDir, { recursive: true })
copyFileSync(source, join(destinationDir, BINARY))
console.log(`${BINARY} copiado a ${destinationDir}`)
