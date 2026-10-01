import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasMediaExtension } from '@shared/formats'
import { pathsFromArgv } from '../../src/main/domain/argvPaths'
import { expandPaths } from '../../src/main/infrastructure/fs/expandPaths'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'input-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function touch(...parts: string[]): Promise<string> {
  const path = join(root, ...parts)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, '')
  return path
}

describe('hasMediaExtension', () => {
  it('reconoce video y audio sin distinguir mayúsculas', () => {
    expect(hasMediaExtension('C:\\v\\clase.MP4')).toBe(true)
    expect(hasMediaExtension('/a/b/voz.opus')).toBe(true)
    expect(hasMediaExtension('notas.txt')).toBe(false)
    expect(hasMediaExtension('mp4')).toBe(false)
    expect(hasMediaExtension('.mp4')).toBe(false)
    expect(hasMediaExtension('C:\\carpeta.mp4\\archivo')).toBe(false)
  })
})

describe('expandPaths', () => {
  it('recorre carpetas y subcarpetas, filtra por extensión y cuenta los ignorados', async () => {
    await touch('b.mp4')
    await touch('a.mp3')
    await touch('notas.txt')
    await touch('sub', 'c.mkv')
    await touch('sub', 'portada.jpg')
    await touch('sub', 'otra', 'd.wav')
    const result = await expandPaths([root])
    expect(result.files).toEqual([
      join(root, 'a.mp3'),
      join(root, 'b.mp4'),
      join(root, 'sub', 'c.mkv'),
      join(root, 'sub', 'otra', 'd.wav')
    ])
    expect(result.ignored).toBe(2)
  })

  it('ordena como el Explorador (números naturales)', async () => {
    await touch('clase 10.mp4')
    await touch('clase 2.mp4')
    await touch('clase 1.mp4')
    const { files } = await expandPaths([root])
    expect(files.map((f) => f.slice(root.length + 1))).toEqual([
      'clase 1.mp4',
      'clase 2.mp4',
      'clase 10.mp4'
    ])
  })

  it('un archivo suelto entra aunque su extensión sea desconocida', async () => {
    const raro = await touch('grabacion.xyz')
    expect(await expandPaths([raro])).toEqual({ files: [raro], ignored: 0 })
  })

  it('sin repetidos y sin rutas que no existen', async () => {
    const a = await touch('a.mp4')
    const result = await expandPaths([a, root, a.toUpperCase(), join(root, 'no-existe.mp4')])
    expect(result).toEqual({ files: [a], ignored: 0 })
  })

  it('50 videos en una carpeta se encolan completos', async () => {
    for (let i = 1; i <= 50; i++) await touch('lote', `video${i}.mp4`)
    const { files } = await expandPaths([join(root, 'lote')])
    expect(files).toHaveLength(50)
  })
})

describe('pathsFromArgv', () => {
  const cwd = join(tmpdir(), 'cwd')
  const appPath = join(tmpdir(), 'proyecto')
  const video = join(tmpdir(), 'a.mp4')

  it('salta el exe y las opciones', () => {
    expect(pathsFromArgv(['app.exe', '--allow-file-access', video, ''], cwd, appPath)).toEqual([
      video
    ])
  })

  it('sin empaquetar descarta la carpeta de la app esté donde esté', () => {
    // `.` es relativo al directorio de trabajo; Chromium puede poner sus opciones delante.
    expect(
      pathsFromArgv(['electron.exe', '--user-data-dir=x', '.', video], appPath, appPath)
    ).toEqual([video])
    expect(pathsFromArgv(['electron.exe', appPath.toUpperCase()], cwd, appPath)).toEqual([])
  })

  it('las rutas relativas se resuelven contra el directorio de trabajo', () => {
    expect(pathsFromArgv(['app.exe', 'clase.mp4'], cwd, appPath)).toEqual([join(cwd, 'clase.mp4')])
  })
})
