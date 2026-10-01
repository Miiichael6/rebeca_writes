import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, open, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { mediaUrl } from '@shared/media'
import { createMediaHandler } from '../../src/main/infrastructure/media/mediaHandler'
import { MediaRegistry } from '../../src/main/domain/mediaRegistry'

const GB = 1024 * 1024 * 1024

let dir: string
let smallPath: string
let bigPath: string
const registry = new MediaRegistry()
const registerMedia = (path: string): string => registry.register(path)
const unregisterMedia = (id: string): void => registry.unregister(id)
const handler = createMediaHandler((id) => registry.resolve(id))

function get(url: string, range?: string): Promise<Response> {
  return handler(new Request(url, { headers: range ? { Range: range } : {} }))
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'media-protocol-'))
  smallPath = join(dir, 'small.mp4')
  await writeFile(smallPath, Buffer.from('0123456789'))

  // Archivo disperso de 1,5 GB: ocupa casi nada en disco, pero stat() da el tamaño completo.
  bigPath = join(dir, 'big.mkv')
  const fh = await open(bigPath, 'w')
  await fh.truncate(1.5 * GB)
  await fh.write(Buffer.from('END!'), 0, 4, 1.5 * GB - 4)
  await fh.close()
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('media:// handler', () => {
  it('sin Range devuelve 200 con el archivo completo', async () => {
    const res = await get(mediaUrl(registerMedia(smallPath)))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe('10')
    expect(res.headers.get('Accept-Ranges')).toBe('bytes')
    expect(res.headers.get('Content-Type')).toBe('video/mp4')
    expect(await res.text()).toBe('0123456789')
  })

  it('con Range devuelve 206 y solo ese trozo', async () => {
    const res = await get(mediaUrl(registerMedia(smallPath)), 'bytes=2-5')
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10')
    expect(res.headers.get('Content-Length')).toBe('4')
    expect(await res.text()).toBe('2345')
  })

  it('Range inválido devuelve 416', async () => {
    const res = await get(mediaUrl(registerMedia(smallPath)), 'bytes=50-')
    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBe('bytes */10')
  })

  it('en un archivo de más de 1 GB sirve el final sin leer el resto', async () => {
    const res = await get(mediaUrl(registerMedia(bigPath)), 'bytes=-4')
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe(
      `bytes ${1.5 * GB - 4}-${1.5 * GB - 1}/${1.5 * GB}`
    )
    expect(await res.text()).toBe('END!')
  })

  it('un seek al medio no trae el archivo entero', async () => {
    const start = 0.75 * GB
    const res = await get(mediaUrl(registerMedia(bigPath)), `bytes=${start}-${start + 1023}`)
    expect(res.status).toBe(206)
    expect((await res.arrayBuffer()).byteLength).toBe(1024)
  })

  it('un id no registrado da 404', async () => {
    expect((await get(mediaUrl('no-existe'))).status).toBe(404)
  })

  it('no acepta rutas en la URL, solo ids', async () => {
    const encoded = encodeURIComponent(smallPath)
    expect((await get(`media://file/${encoded}`)).status).toBe(404)
    expect((await get('media://file/..%2F..%2Fetc%2Fpasswd')).status).toBe(404)
  })

  it('un host distinto de file da 404', async () => {
    const id = registerMedia(smallPath)
    expect((await get(`media://otro/${id}`)).status).toBe(404)
  })

  it('un archivo registrado que ya no existe da 404', async () => {
    const id = registerMedia(join(dir, 'borrado.mp4'))
    expect((await get(mediaUrl(id))).status).toBe(404)
  })

  it('tras unregisterMedia deja de servirse', async () => {
    const id = registerMedia(smallPath)
    unregisterMedia(id)
    expect((await get(mediaUrl(id))).status).toBe(404)
  })
})

describe('mediaRegistry', () => {
  it('el mismo archivo conserva el mismo id', () => {
    expect(registerMedia(join(dir, 'a.mp4'))).toBe(registerMedia(join(dir, 'a.mp4')))
  })

  it('rechaza rutas relativas o con ..', () => {
    expect(() => registerMedia('relativo.mp4')).toThrow()
    expect(() => registerMedia(`${dir}/../y.mp4`)).toThrow()
  })
})
