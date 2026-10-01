// Copia los sidecars compilados en release a resources/bin/, desde donde main los lanza y
// electron-builder los empaqueta fuera del asar (asarUnpack: resources/**): rl-capture.exe
// (captura de audio, tarea 29), rl-hotkey.exe (atajo para grabar, tarea 31) y rl-calls.exe
// (uso del micrófono para sugerir grabar reuniones, tarea 32).
import { copyFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BINARIES = ['rl-capture.exe', 'rl-hotkey.exe', 'rl-calls.exe']
const ROOT = resolve(import.meta.dirname, '..')
const sourceDir = join(ROOT, 'native', 'target', 'release')
const destinationDir = join(ROOT, 'resources', 'bin')

mkdirSync(destinationDir, { recursive: true })
for (const binary of BINARIES) {
  copyFileSync(join(sourceDir, binary), join(destinationDir, binary))
  console.log(`${binary} copiado a ${destinationDir}`)
}
