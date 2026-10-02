// Copia los sidecars compilados en release a resources/bin/, desde donde main los lanza y
// electron-builder los empaqueta fuera del asar (asarUnpack: resources/**): rl-capture.exe
// (captura de audio, tarea 29), rl-hotkey.exe (atajo para grabar, tarea 31) y rl-calls.exe
// (uso del micrófono para sugerir grabar reuniones, tarea 32). rl-speaker.exe (huellas de voz,
// tarea 35) va a resources/bin/speaker/, junto a las DLL que deja `npm run fetch:speaker`.
import { copyFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const sourceDir = join(ROOT, 'native', 'target', 'release')
const binDir = join(ROOT, 'resources', 'bin')
/** Binario → carpeta de destino. */
const BINARIES = {
  'rl-capture.exe': binDir,
  'rl-hotkey.exe': binDir,
  'rl-calls.exe': binDir,
  'rl-speaker.exe': join(binDir, 'speaker')
}

for (const [binary, destinationDir] of Object.entries(BINARIES)) {
  mkdirSync(destinationDir, { recursive: true })
  copyFileSync(join(sourceDir, binary), join(destinationDir, binary))
  console.log(`${binary} copiado a ${destinationDir}`)
}
