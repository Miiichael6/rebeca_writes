import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CudaInstallError } from '../../src/main/domain/downloads'
import {
  installFromZip,
  keepFile,
  VC_RUNTIME
} from '../../src/main/infrastructure/downloads/cudaInstall'

const TAR = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')

let dir: string
let target: string
let vcDir: string

/** Arma un zip como el oficial (todo dentro de `Release/`) con el tar de Windows. */
async function makeZip(files: string[]): Promise<{ zip: string; sha256: string }> {
  const src = join(dir, 'src')
  await mkdir(join(src, 'Release'), { recursive: true })
  for (const name of files) await writeFile(join(src, 'Release', name), name)
  const zip = join(dir, 'cuda.zip')
  execFileSync(TAR, ['-a', '-cf', zip, '-C', src, 'Release'])
  const sha256 = createHash('sha256')
    .update(await readFile(zip))
    .digest('hex')
  return { zip, sha256 }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rw-cuda-'))
  target = join(dir, 'backends', 'cuda')
  vcDir = join(dir, 'cpu')
  await mkdir(join(dir, 'backends'))
  await mkdir(vcDir)
  for (const name of VC_RUNTIME) await writeFile(join(vcDir, name), name)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('keepFile', () => {
  it('deja whisper-cli y las DLL, sin las que sobran', () => {
    expect(keepFile('whisper-cli.exe')).toBe(true)
    expect(keepFile('ggml-cuda.dll')).toBe(true)
    expect(keepFile('SDL2.dll')).toBe(false)
    expect(keepFile('whisper-server.exe')).toBe(false)
  })
})

describe.runIf(process.platform === 'win32')('installFromZip', () => {
  const files = ['whisper-cli.exe', 'ggml-cuda.dll', 'cublas64_12.dll', 'SDL2.dll', 'main.exe']

  it('instala solo lo necesario, con el runtime de Visual C++, y borra el zip', async () => {
    const { zip, sha256 } = await makeZip(files)
    const validate = vi.fn(async () => true)

    await installFromZip({ zip, target, sha256, vcRuntimeDir: vcDir, validate })

    expect(validate).toHaveBeenCalledWith(join(`${target}.tmp`, 'staged', 'whisper-cli.exe'))
    expect((await readdir(target)).sort()).toEqual(
      ['cublas64_12.dll', 'ggml-cuda.dll', 'whisper-cli.exe', ...VC_RUNTIME].sort()
    )
    expect(existsSync(zip)).toBe(false)
    expect(existsSync(`${target}.tmp`)).toBe(false)
  })

  it('si la GPU no valida no toca el paquete anterior y limpia todo', async () => {
    await mkdir(target)
    await writeFile(join(target, 'whisper-cli.exe'), 'anterior')
    const { zip, sha256 } = await makeZip(files)

    const install = installFromZip({
      zip,
      target,
      sha256,
      vcRuntimeDir: vcDir,
      validate: async () => false
    })
    await expect(install).rejects.toMatchObject({ code: 'cudaInvalid' })

    expect(await readFile(join(target, 'whisper-cli.exe'), 'utf8')).toBe('anterior')
    expect(existsSync(`${target}.tmp`)).toBe(false)
    expect(existsSync(zip)).toBe(false)
  })

  it('un zip dañado (SHA-256 distinto) falla con sizeMismatch sin extraer', async () => {
    const { zip } = await makeZip(files)
    const extract = vi.fn(async () => {})

    const install = installFromZip({
      zip,
      target,
      sha256: '0'.repeat(64),
      vcRuntimeDir: vcDir,
      validate: async () => true,
      extract
    })
    await expect(install).rejects.toBeInstanceOf(CudaInstallError)
    await expect(install).rejects.toMatchObject({ code: 'sizeMismatch' })
    expect(extract).not.toHaveBeenCalled()
    expect(existsSync(target)).toBe(false)
    expect(existsSync(zip)).toBe(false)
  })

  it('un zip sin whisper-cli.exe falla con cudaInvalid', async () => {
    const { zip, sha256 } = await makeZip(['ggml-cuda.dll'])
    const install = installFromZip({
      zip,
      target,
      sha256,
      vcRuntimeDir: vcDir,
      validate: async () => true
    })
    await expect(install).rejects.toMatchObject({ code: 'cudaInvalid' })
    expect(existsSync(target)).toBe(false)
  })
})
