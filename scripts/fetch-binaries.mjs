/* eslint-disable @typescript-eslint/explicit-function-return-type -- JS plano: no admite anotaciones de tipo */
// Descarga las builds oficiales de whisper.cpp para Windows x64 (releases de ggml-org/whisper.cpp)
// y deja whisper-cli.exe + DLLs en resources/bin/<backend>/.
//
//   npm run fetch:bin                   versión fijada en WHISPER_RELEASE
//   npm run fetch:bin -- --latest       la release más reciente que publique los zips necesarios
//   npm run fetch:bin -- --force        vuelve a descargar aunque la versión ya esté
//   npm run fetch:bin -- --only=cpu     solo algunos backends (cpu, cuda, vulkan; separados por coma)
//
// La API de GitHub limita a 60 peticiones/hora sin token; si hace falta, define GITHUB_TOKEN.
// Vulkan no se publica para Windows x64: si la release no lo trae, se avisa y hay que compilarlo
// (ver README).
//
// Las builds dependen del runtime de Visual C++ (msvcp140, vcruntime140…), que no viene con
// Windows. Se copia "app-local" junto a whisper-cli.exe desde System32 de esta máquina, que
// necesita tener instalado el Visual C++ Redistributable x64.

import { createWriteStream, existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const REPO = 'ggml-org/whisper.cpp'
/** Release probada. Los tags `vX.Y.Z` salen sin binarios; los publica el tag de build `bNNNN`. */
const WHISPER_RELEASE = 'b5130'

/** Zip de cada backend dentro de la release. */
const ASSETS = {
  cpu: /^whisper-bin-x64\.zip$/,
  cuda: /^whisper-cublas-12\.[\d.]+-bin-x64\.zip$/,
  vulkan: /^whisper-vulkan-bin-x64\.zip$/
}

/** Archivos del zip que necesita whisper-cli. El resto (otros ejemplos, SDL2, llama…) sobra. */
const EXCLUDED_DLLS = new Set(['sdl2.dll', 'llama.dll', 'parakeet.dll', 'nvblas64_12.dll'])
const keepFile = (name) => {
  const lower = name.toLowerCase()
  return lower === 'whisper-cli.exe' || (lower.endsWith('.dll') && !EXCLUDED_DLLS.has(lower))
}

/** Runtime de Visual C++ que importan whisper-cli y las ggml-*.dll (vcomp140 = OpenMP). */
const VC_RUNTIME = ['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll', 'vcomp140.dll']
const SYSTEM32 = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')

const VERSION_FILE = '.version'
const BIN_DIR = resolve(import.meta.dirname, '..', 'resources', 'bin')
const TMP_DIR = join(BIN_DIR, '.tmp')

const args = process.argv.slice(2)
const force = args.includes('--force')
const latest = args.includes('--latest')
const only = args
  .find((a) => a.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
const backends = Object.keys(ASSETS).filter((b) => !only || only.includes(b))

const exec = promisify(execFile)

async function github(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'fetch-binaries' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, { headers })
  if (!res.ok) throw new Error(`GitHub ${path}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

/** Release fijada, o con --latest la más reciente que trae los zips de CPU y CUDA. */
async function findRelease() {
  if (!latest) return github(`releases/tags/${WHISPER_RELEASE}`)
  const releases = await github('releases?per_page=20')
  const release = releases.find(
    (r) =>
      !r.draft &&
      r.assets.some((a) => ASSETS.cpu.test(a.name)) &&
      r.assets.some((a) => ASSETS.cuda.test(a.name))
  )
  if (!release) throw new Error('Ninguna release reciente publica los zips de CPU y CUDA')
  return release
}

async function installedVersion(backend) {
  const dir = join(BIN_DIR, backend)
  if (!existsSync(join(dir, 'whisper-cli.exe'))) return null
  try {
    return (await readFile(join(dir, VERSION_FILE), 'utf8')).trim()
  } catch {
    return null
  }
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function download(url, dest, size) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fetch-binaries' } })
  if (!res.ok || !res.body) throw new Error(`Descarga ${url}: HTTP ${res.status}`)

  let received = 0
  let lastLog = 0
  const body = Readable.fromWeb(res.body)
  body.on('data', (chunk) => {
    received += chunk.length
    const now = Date.now()
    if (process.stdout.isTTY && now - lastLog > 250) {
      lastLog = now
      const pct = size ? ` ${Math.floor((received / size) * 100)}%` : ''
      process.stdout.write(`\r  ${formatMB(received)} / ${formatMB(size)}${pct}   `)
    }
  })
  await pipeline(body, createWriteStream(dest))
  if (process.stdout.isTTY) process.stdout.write('\n')
  if (size && received !== size) {
    throw new Error(`Descarga incompleta: ${received} de ${size} bytes`)
  }
}

/**
 * Extrae con el tar de Windows (bsdtar, lee zip). No se usa `tar` del PATH porque en Git Bash
 * resuelve a GNU tar, que no abre zips.
 */
async function extract(zip, dest) {
  const tar = join(SYSTEM32, 'tar.exe')
  await exec(tar, ['-xf', zip, '-C', dest])
}

/** Busca recursivamente la carpeta que contiene whisper-cli.exe (el zip trae `Release/`). */
async function findCliDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  if (entries.some((e) => e.isFile() && e.name.toLowerCase() === 'whisper-cli.exe')) return dir
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const found = await findCliDir(join(dir, e.name))
    if (found) return found
  }
  return null
}

async function install(backend, asset, tag) {
  const work = join(TMP_DIR, backend)
  await rm(work, { recursive: true, force: true })
  await mkdir(work, { recursive: true })

  const zip = join(work, asset.name)
  console.log(`[${backend}] descargando ${asset.name} (${formatMB(asset.size)})`)
  await download(asset.browser_download_url, zip, asset.size)

  const unpacked = join(work, 'unpacked')
  await mkdir(unpacked)
  await extract(zip, unpacked)
  const source = await findCliDir(unpacked)
  if (!source) throw new Error(`${asset.name} no contiene whisper-cli.exe`)

  // Se arma la carpeta nueva al lado y se reemplaza al final, para no dejar una a medias.
  const staged = join(work, 'staged')
  await mkdir(staged)
  const files = (await readdir(source)).filter(keepFile)
  for (const name of files) await rename(join(source, name), join(staged, name))
  await writeFile(join(staged, VERSION_FILE), `${tag}\n`)

  const target = join(BIN_DIR, backend)
  await rm(target, { recursive: true, force: true })
  await rename(staged, target)
  await rm(work, { recursive: true, force: true })
  console.log(`[${backend}] listo: ${files.length} archivos en resources/bin/${backend}/`)
}

/** Copia el runtime de Visual C++ a la carpeta del backend si falta. */
async function copyVcRuntime(backend) {
  const dir = join(BIN_DIR, backend)
  if (!existsSync(join(dir, 'whisper-cli.exe'))) return
  let copied = 0
  for (const name of VC_RUNTIME) {
    if (existsSync(join(dir, name))) continue
    const source = join(SYSTEM32, name)
    if (!existsSync(source)) {
      throw new Error(
        `Falta ${source}. Instala el Visual C++ Redistributable x64: https://aka.ms/vs/17/release/vc_redist.x64.exe`
      )
    }
    await copyFile(source, join(dir, name))
    copied++
  }
  if (copied > 0) console.log(`[${backend}] runtime de Visual C++: ${copied} DLL copiadas`)
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error(
      'fetch-binaries solo descarga builds de Windows y necesita el tar.exe de Windows'
    )
  }
  await mkdir(BIN_DIR, { recursive: true })

  const release = await findRelease()
  const tag = release.tag_name
  console.log(`whisper.cpp ${tag} (${release.html_url})`)

  for (const backend of backends) {
    const current = await installedVersion(backend)
    if (current === tag && !force) {
      console.log(`[${backend}] ya está en ${tag}, se omite`)
      await copyVcRuntime(backend)
      continue
    }
    const asset = release.assets.find((a) => ASSETS[backend].test(a.name))
    if (!asset) {
      const hint = backend === 'vulkan' ? ' Compílalo a mano: ver README, "Build Vulkan".' : ''
      console.warn(`[${backend}] la release ${tag} no publica un zip para este backend.${hint}`)
      continue
    }
    await install(backend, asset, tag)
    await copyVcRuntime(backend)
  }
  await rm(TMP_DIR, { recursive: true, force: true })
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
