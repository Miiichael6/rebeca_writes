// Falla con un mensaje claro si faltan los binarios que van dentro del instalador.
// Se ejecuta como `prebuild:win` / `prebuild:unpack`. CUDA no se exige: no se empaqueta (D2).

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CPU_DIR = join(ROOT, 'resources', 'bin', 'cpu')
/** Runtime de Visual C++ app-local (lo copia fetch-binaries); sin él whisper-cli no arranca en un Windows limpio. */
const VC_RUNTIME = ['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll', 'vcomp140.dll']
const REQUIRED = [
  ...['whisper-cli.exe', ...VC_RUNTIME].map((name) => ({
    file: join(CPU_DIR, name),
    fix: 'npm run fetch:bin -- --only=cpu'
  })),
  // Sidecars: captura de audio (tarea 29), atajo para grabar (31) y uso del micrófono (32).
  ...['rl-capture.exe', 'rl-hotkey.exe', 'rl-calls.exe'].map((name) => ({
    file: join(ROOT, 'resources', 'bin', name),
    fix: 'npm run build:native'
  })),
  // ffmpeg-static lo descarga en su postinstall; puede faltar si se instaló con --ignore-scripts.
  {
    file: join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    fix: 'npm rebuild ffmpeg-static'
  },
  {
    file: join(ROOT, 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe'),
    fix: 'npm install'
  }
]

const missing = REQUIRED.filter(({ file }) => !existsSync(file))
if (missing.length > 0) {
  console.error('\nFaltan binarios necesarios para el instalador:')
  for (const { file, fix } of missing) console.error(`  - ${file}\n    → ${fix}`)
  console.error('')
  process.exit(1)
}
console.log('Binarios OK (whisper-cli cpu + runtime VC++, rl-capture, rl-hotkey, rl-calls, ffmpeg, ffprobe).')
