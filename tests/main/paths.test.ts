import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => '', getPath: () => '' }
}))

const { getWhisperCli, installedBackends, whisperCliPath } =
  await import('../../src/main/engine/paths')
const { BackendNotInstalledError } = await import('../../src/main/engine/fallback')

let dir: string
let bundled: string
let downloaded: string

async function install(root: string, backend: string): Promise<void> {
  await mkdir(join(root, backend), { recursive: true })
  await writeFile(join(root, backend, 'whisper-cli.exe'), '')
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rw-paths-'))
  bundled = join(dir, 'resources', 'bin')
  downloaded = join(dir, 'userData', 'backends')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('whisperCliPath con dos raíces', () => {
  it('prefiere lo que trae la app', async () => {
    await install(bundled, 'cuda')
    await install(downloaded, 'cuda')
    expect(whisperCliPath('cuda', [bundled, downloaded])).toBe(
      join(bundled, 'cuda', 'whisper-cli.exe')
    )
  })

  it('usa el descargado si la app no lo trae', async () => {
    await install(bundled, 'cpu')
    await install(downloaded, 'cuda')
    expect(whisperCliPath('cuda', [bundled, downloaded])).toBe(
      join(downloaded, 'cuda', 'whisper-cli.exe')
    )
  })

  it('si no está en ninguna devuelve la ruta de la primera y getWhisperCli falla', () => {
    expect(whisperCliPath('vulkan', [bundled, downloaded])).toBe(
      join(bundled, 'vulkan', 'whisper-cli.exe')
    )
    expect(() => getWhisperCli('vulkan', [bundled, downloaded])).toThrow(BackendNotInstalledError)
  })
})

describe('installedBackends con dos raíces', () => {
  it('une las dos raíces en orden de preferencia', async () => {
    await install(bundled, 'cpu')
    expect(installedBackends([bundled, downloaded])).toEqual(['cpu'])
    await install(downloaded, 'cuda')
    expect(installedBackends([bundled, downloaded])).toEqual(['cuda', 'cpu'])
  })

  it('una carpeta sin whisper-cli.exe no cuenta (instalación a medias)', async () => {
    await install(bundled, 'cpu')
    await mkdir(join(downloaded, 'cuda'), { recursive: true })
    expect(installedBackends([bundled, downloaded])).toEqual(['cpu'])
  })
})
