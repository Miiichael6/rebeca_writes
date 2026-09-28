import { describe, expect, it } from 'vitest'
import { mimeTypeFor, parseRange } from '../../src/main/services/mediaRange'

describe('parseRange', () => {
  const size = 1000

  it('sin cabecera devuelve null (archivo completo)', () => {
    expect(parseRange(null, size)).toBeNull()
    expect(parseRange('', size)).toBeNull()
  })

  it('bytes=0- va hasta el final', () => {
    expect(parseRange('bytes=0-', size)).toEqual({ start: 0, end: 999 })
  })

  it('bytes=100-200 es inclusivo', () => {
    expect(parseRange('bytes=100-200', size)).toEqual({ start: 100, end: 200 })
  })

  it('bytes=-500 son los últimos 500 bytes', () => {
    expect(parseRange('bytes=-500', size)).toEqual({ start: 500, end: 999 })
  })

  it('un sufijo mayor que el archivo devuelve el archivo entero', () => {
    expect(parseRange('bytes=-5000', size)).toEqual({ start: 0, end: 999 })
  })

  it('un final más allá del archivo se recorta', () => {
    expect(parseRange('bytes=900-5000', size)).toEqual({ start: 900, end: 999 })
  })

  it.each([
    'bytes=1000-',
    'bytes=200-100',
    'bytes=-0',
    'bytes=-',
    'bytes=abc',
    'items=0-10',
    'bytes=0-10,20-30',
    '0-10'
  ])('%s es inválido', (header) => {
    expect(parseRange(header, size)).toBe('invalid')
  })

  it('cualquier rango sobre un archivo vacío es inválido', () => {
    expect(parseRange('bytes=0-', 0)).toBe('invalid')
  })
})

describe('mimeTypeFor', () => {
  it('reconoce extensiones comunes sin distinguir mayúsculas', () => {
    expect(mimeTypeFor('C:\\v\\clip.MP4')).toBe('video/mp4')
    expect(mimeTypeFor('/a/b.webm')).toBe('video/webm')
    expect(mimeTypeFor('/a/b.mp3')).toBe('audio/mpeg')
  })

  it('lo desconocido va como binario', () => {
    expect(mimeTypeFor('/a/b.xyz')).toBe('application/octet-stream')
    expect(mimeTypeFor('/a/sin_extension')).toBe('application/octet-stream')
  })
})
