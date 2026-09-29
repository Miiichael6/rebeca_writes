import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { createReadStream, existsSync } from 'fs'
import { copyFile, mkdir, readdir, rename, rm, unlink } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

// Instalación del paquete CUDA ya descargado, sin Electron: se prueba con Vitest usando zips
// generados con el tar de Windows. `services/cudaPackage.ts` pone las rutas y la validación.

const exec = promisify(execFile)

/** Runtime de Visual C++ que whisper-cli necesita junto al exe (el zip oficial no lo trae). */
export const VC_RUNTIME = ['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll', 'vcomp140.dll']

/** Lo que sobra del zip, igual que en `scripts/fetch-binaries.mjs`. */
const EXCLUDED_DLLS = new Set(['sdl2.dll', 'llama.dll', 'parakeet.dll', 'nvblas64_12.dll'])

export function keepFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === 'whisper-cli.exe' || (lower.endsWith('.dll') && !EXCLUDED_DLLS.has(lower))
}

export class CudaInstallError extends Error {
  constructor(
    /** `sizeMismatch`: el zip está dañado. `cudaInvalid`: no trae whisper-cli o no arranca. */
    readonly code: 'sizeMismatch' | 'cudaInvalid',
    message: string
  ) {
    super(message)
    this.name = 'CudaInstallError'
  }
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

/**
 * Extrae con el `tar.exe` de Windows (bsdtar, lee zip), así no hace falta ningún módulo. Se usa
 * la ruta de System32: en el PATH puede haber otro tar (el GNU tar de Git no abre zips).
 */
export async function extractZip(zip: string, dest: string): Promise<void> {
  const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
  await exec(tar, ['-xf', zip, '-C', dest], { windowsHide: true })
}

/** Carpeta que contiene whisper-cli.exe dentro de lo extraído (el zip trae `Release/`). */
export async function findCliDir(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true })
  if (entries.some((e) => e.isFile() && e.name.toLowerCase() === 'whisper-cli.exe')) return dir
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const found = await findCliDir(join(dir, e.name))
    if (found) return found
  }
  return null
}

export interface InstallOptions {
  zip: string
  /** Carpeta final, p. ej. `userData/backends/cuda`. Se arma en `<target>.tmp`. */
  target: string
  sha256: string
  /** Carpeta de donde copiar el runtime de Visual C++ (la de CPU que trae la app). */
  vcRuntimeDir: string
  /** Comprueba que el whisper-cli armado arranca y ve la GPU. */
  validate: (cliPath: string) => Promise<boolean>
  extract?: (zip: string, dest: string) => Promise<void>
}

/**
 * Verifica el zip, lo extrae en `<target>.tmp`, deja solo whisper-cli y sus DLL, añade el
 * runtime de Visual C++ y lo valida. Solo si todo va bien reemplaza `target` con un rename, así
 * nunca queda un paquete a medias. El zip se borra siempre: si falla la validación no sirve
 * volver a intentarlo con el mismo, y ocupa ~650 MB.
 */
export async function installFromZip(options: InstallOptions): Promise<void> {
  const { zip, target, sha256, vcRuntimeDir, validate, extract = extractZip } = options
  const work = `${target}.tmp`
  await rm(work, { recursive: true, force: true })

  try {
    if ((await sha256File(zip)) !== sha256.toLowerCase()) {
      throw new CudaInstallError('sizeMismatch', `SHA-256 de ${zip} no coincide`)
    }

    const unpacked = join(work, 'unpacked')
    const staged = join(work, 'staged')
    await mkdir(unpacked, { recursive: true })
    await mkdir(staged)
    await extract(zip, unpacked)

    const source = await findCliDir(unpacked)
    if (!source) throw new CudaInstallError('cudaInvalid', 'El zip no contiene whisper-cli.exe')
    for (const name of (await readdir(source)).filter(keepFile)) {
      await rename(join(source, name), join(staged, name))
    }
    for (const name of VC_RUNTIME) {
      const from = join(vcRuntimeDir, name)
      if (existsSync(from) && !existsSync(join(staged, name))) {
        await copyFile(from, join(staged, name))
      }
    }

    if (!(await validate(join(staged, 'whisper-cli.exe')))) {
      throw new CudaInstallError('cudaInvalid', 'whisper-cli (CUDA) no arrancó o no vio la GPU')
    }

    await rm(target, { recursive: true, force: true })
    await rename(staged, target)
  } finally {
    await rm(work, { recursive: true, force: true })
    await unlink(zip).catch(() => {})
  }
}
