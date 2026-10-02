/* eslint-disable @typescript-eslint/explicit-function-return-type -- JS plano: no admite anotaciones de tipo */
// Descarga las DLL que carga rl-speaker.exe ("Detectar quién habla", tarea 35) a
// resources/bin/speaker/: sherpa-onnx-c-api.dll y el onnxruntime con el que se compiló.
// Salen del paquete oficial de sherpa-onnx (win-x64, shared, MD, sin TTS).
//
//   npm run fetch:speaker             descarga si falta o cambió la versión
//   npm run fetch:speaker -- --force  vuelve a descargar
import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'

const VERSION = 'v1.13.8'
const PACKAGE = `sherpa-onnx-${VERSION}-win-x64-shared-MD-Release-no-tts`
const URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/${VERSION}/${PACKAGE}.tar.bz2`
const LIBRARIES = ['sherpa-onnx-c-api.dll', 'onnxruntime.dll', 'onnxruntime_providers_shared.dll']
const VERSION_FILE = '.version'
const SPEAKER_DIR = resolve(import.meta.dirname, '..', 'resources', 'bin', 'speaker')
const TMP_DIR = join(SPEAKER_DIR, '.tmp')
const TAR = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')

const exec = promisify(execFile)
const force = process.argv.includes('--force')

async function installedVersion() {
  try {
    return (await readFile(join(SPEAKER_DIR, VERSION_FILE), 'utf8')).trim()
  } catch {
    return null
  }
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fetch-speaker-libs' } })
  if (!res.ok) throw new Error(`Descarga ${url}: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

/** Busca cada DLL dentro del paquete descomprimido (vienen repartidas entre `bin/` y `lib/`). */
async function findLibraries(dir) {
  const found = new Map()
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && LIBRARIES.includes(entry.name) && !found.has(entry.name)) {
      found.set(entry.name, join(entry.parentPath, entry.name))
    }
  }
  const missing = LIBRARIES.filter((name) => !found.has(name))
  if (missing.length > 0) throw new Error(`El paquete no trae: ${missing.join(', ')}`)
  return found
}

async function main() {
  if (!force && (await installedVersion()) === VERSION) {
    console.log(`sherpa-onnx ${VERSION} ya está en ${SPEAKER_DIR}`)
    return
  }
  await rm(TMP_DIR, { recursive: true, force: true })
  await mkdir(TMP_DIR, { recursive: true })
  try {
    const archive = join(TMP_DIR, `${PACKAGE}.tar.bz2`)
    console.log(`Descargando ${URL}`)
    await download(URL, archive)
    await exec(TAR, ['-xf', archive, '-C', TMP_DIR])
    for (const [name, source] of await findLibraries(TMP_DIR)) {
      await copyFile(source, join(SPEAKER_DIR, name))
      console.log(`${name} copiado a ${SPEAKER_DIR}`)
    }
    await writeFile(join(SPEAKER_DIR, VERSION_FILE), VERSION)
  } finally {
    await rm(TMP_DIR, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
