import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { existsSync } from 'fs'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DownloadProgress } from '../../src/main/application/ports/fileDownloader'
import { DownloadError, partPath } from '../../src/main/domain/downloads'
import {
  contentRangeStart,
  downloadWithResume,
  hasGgmlHeader,
  SpeedMeter
} from '../../src/main/infrastructure/downloads/modelDownload'

const DATA = Buffer.from(Array.from({ length: 64 * 1024 }, (_, i) => i % 251))

type Mode = 'range' | 'ignore-range' | 'cut' | 'too-big' | 'error'
let mode: Mode = 'range'
let lastRange: string | undefined
let server: Server
let baseUrl: string
let dir: string

function handler(req: IncomingMessage, res: ServerResponse): void {
  // Como Hugging Face: /model redirige al "CDN".
  if (req.url === '/model') {
    res.writeHead(302, { Location: '/cdn' }).end()
    return
  }
  lastRange = req.headers.range
  if (mode === 'error') {
    res.writeHead(500).end()
    return
  }
  if (mode === 'too-big') {
    res
      .writeHead(200, { 'Content-Length': DATA.length + 10 })
      .end(Buffer.concat([DATA, Buffer.alloc(10)]))
    return
  }
  const match = mode !== 'ignore-range' && lastRange?.match(/^bytes=(\d+)-$/)
  const start = match ? Number(match[1]) : 0
  if (start >= DATA.length) {
    res.writeHead(416).end()
    return
  }
  const body = DATA.subarray(start)
  res.writeHead(match ? 206 : 200, {
    'Content-Length': body.length,
    ...(match && { 'Content-Range': `bytes ${start}-${DATA.length - 1}/${DATA.length}` })
  })
  if (mode === 'cut') {
    // Manda la mitad y corta la conexión, como una red que se cae.
    res.write(body.subarray(0, body.length / 2))
    setTimeout(() => res.destroy(), 50)
    return
  }
  res.end(body)
}

beforeAll(async () => {
  server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

beforeEach(async () => {
  mode = 'range'
  lastRange = undefined
  dir = await mkdtemp(join(tmpdir(), 'models-test-'))
})

afterEach(() => rm(dir, { recursive: true, force: true }))

const download = (extra: Partial<Parameters<typeof downloadWithResume>[0]> = {}): Promise<void> =>
  downloadWithResume({
    url: `${baseUrl}/model`,
    dest: join(dir, 'ggml-test.bin'),
    expectedSize: DATA.length,
    ...extra
  })

describe('downloadWithResume', () => {
  it('descarga siguiendo la redirección y renombra .part → .bin', async () => {
    const progress: DownloadProgress[] = []
    await download({ onProgress: (p) => progress.push(p) })
    const dest = join(dir, 'ggml-test.bin')
    expect(await readFile(dest)).toEqual(DATA)
    expect(existsSync(partPath(dest))).toBe(false)
    expect(lastRange).toBeUndefined()
    expect(progress.at(-1)).toMatchObject({ received: DATA.length, total: DATA.length })
  })

  it('reanuda desde el tamaño del .part con Range y 206', async () => {
    const dest = join(dir, 'ggml-test.bin')
    await writeFile(partPath(dest), DATA.subarray(0, 1000))
    await download()
    expect(lastRange).toBe('bytes=1000-')
    expect(await readFile(dest)).toEqual(DATA)
  })

  it('empieza de cero si el servidor ignora el Range (200)', async () => {
    mode = 'ignore-range'
    const dest = join(dir, 'ggml-test.bin')
    await writeFile(partPath(dest), Buffer.alloc(1000, 0xff))
    await download()
    expect(lastRange).toBe('bytes=1000-')
    expect(await readFile(dest)).toEqual(DATA)
  })

  it('si la red se corta conserva el .part y la siguiente llamada lo completa', async () => {
    mode = 'cut'
    const dest = join(dir, 'ggml-test.bin')
    const error = await download().catch((e) => e)
    expect(error).toBeInstanceOf(DownloadError)
    expect(error.code).toBe('downloadFailed')
    const partial = await readFile(partPath(dest))
    expect(partial.length).toBeGreaterThan(0)
    expect(partial.length).toBeLessThan(DATA.length)

    mode = 'range'
    await download()
    expect(lastRange).toBe(`bytes=${partial.length}-`)
    expect(await readFile(dest)).toEqual(DATA)
  })

  it('al cancelar rechaza con AbortError y conserva el .part', async () => {
    const controller = new AbortController()
    const dest = join(dir, 'ggml-test.bin')
    await writeFile(partPath(dest), DATA.subarray(0, 500))
    controller.abort()
    const error = await download({ signal: controller.signal }).catch((e) => e)
    expect(error.name).toBe('AbortError')
    expect((await readFile(partPath(dest))).length).toBe(500)
    expect(existsSync(dest)).toBe(false)
  })

  it('si el archivo queda más grande de lo esperado, borra el .part', async () => {
    mode = 'too-big'
    const dest = join(dir, 'ggml-test.bin')
    const error = await download().catch((e) => e)
    expect(error).toBeInstanceOf(DownloadError)
    expect(error.code).toBe('sizeMismatch')
    expect(existsSync(partPath(dest))).toBe(false)
    expect(existsSync(dest)).toBe(false)
  })

  it('con 416 borra el .part y vuelve a pedir sin Range', async () => {
    const dest = join(dir, 'ggml-test.bin')
    // El servidor tiene un archivo más corto que el esperado: el Range pide más allá del final.
    await writeFile(partPath(dest), DATA)
    const error = await download({ expectedSize: DATA.length + 10 }).catch((e) => e)
    expect(lastRange).toBeUndefined()
    // Tras el reintento el archivo sigue siendo más corto de lo esperado: queda incompleto.
    expect(error.code).toBe('downloadFailed')
    expect((await readFile(partPath(dest))).length).toBe(DATA.length)
  })

  it('un error HTTP es downloadFailed', async () => {
    mode = 'error'
    const error = await download().catch((e) => e)
    expect(error).toBeInstanceOf(DownloadError)
    expect(error.code).toBe('downloadFailed')
  })
})

describe('SpeedMeter', () => {
  it('promedia sobre la ventana', () => {
    const meter = new SpeedMeter(1000)
    meter.add(0, 0)
    meter.add(500, 500)
    meter.add(1000, 1000)
    expect(meter.bytesPerSec()).toBe(1000)
    // Un pico al final pesa, pero lo antiguo sale de la ventana.
    meter.add(3000, 5000)
    expect(meter.bytesPerSec()).toBe(2000)
  })

  it('sin intervalo da 0', () => {
    const meter = new SpeedMeter()
    meter.add(0, 100)
    expect(meter.bytesPerSec()).toBe(0)
  })
})

describe('contentRangeStart', () => {
  it('lee el inicio del rango', () => {
    expect(contentRangeStart('bytes 100-199/200')).toBe(100)
    expect(contentRangeStart('bytes 0-9/*')).toBe(0)
    expect(contentRangeStart(null)).toBeNull()
    expect(contentRangeStart('bytes */200')).toBeNull()
  })
})

describe('hasGgmlHeader', () => {
  it('acepta el magic ggml y rechaza el resto', async () => {
    const good = join(dir, 'good.bin')
    const bad = join(dir, 'bad.bin')
    const header = Buffer.alloc(8)
    header.writeUInt32LE(0x67676d6c, 0)
    await writeFile(good, header)
    await writeFile(bad, 'hola mundo')
    expect(await hasGgmlHeader(good)).toBe(true)
    expect(await hasGgmlHeader(bad)).toBe(false)
    expect(await hasGgmlHeader(join(dir, 'no-existe.bin'))).toBe(false)
  })
})
