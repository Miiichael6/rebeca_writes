import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import { MEDIA_HOST } from '@shared/media'
import { isSafeMediaPath } from './mediaRegistry'
import { mimeTypeFor, parseRange } from './mediaRange'

/**
 * Handler de `media://file/<id>` sin dependencias de Electron (se prueba con Vitest).
 * `resolve` traduce el id a una ruta de la lista blanca, o `null` si no está.
 */
export function createMediaHandler(
  resolve: (id: string) => string | null
): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url)
    if (url.hostname !== MEDIA_HOST) return new Response(null, { status: 404 })

    const id = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    const filePath = resolve(id)
    if (filePath === null || !isSafeMediaPath(filePath)) {
      return new Response(null, { status: 404 })
    }

    let size: number
    try {
      const info = await stat(filePath)
      if (!info.isFile()) return new Response(null, { status: 404 })
      size = info.size
    } catch {
      return new Response(null, { status: 404 })
    }

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeTypeFor(filePath)
    })

    const range = parseRange(request.headers.get('Range'), size)
    if (range === 'invalid') {
      headers.set('Content-Range', `bytes */${size}`)
      return new Response(null, { status: 416, headers })
    }

    if (range === null) {
      headers.set('Content-Length', String(size))
      return new Response(toWebStream(filePath), { status: 200, headers })
    }

    headers.set('Content-Length', String(range.end - range.start + 1))
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    return new Response(toWebStream(filePath, range.start, range.end), { status: 206, headers })
  }
}

/** Stream web de un trozo del archivo. Si Chromium cancela la petición (seek), se cierra el fd. */
function toWebStream(filePath: string, start?: number, end?: number): ReadableStream {
  return Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
}
