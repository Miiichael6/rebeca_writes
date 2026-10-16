import { describe, expect, it } from 'vitest'
import {
  clipArgs,
  clipExtension,
  clipFileName,
  clipStamp,
  isValidClipRange,
  PeakAccumulator
} from '../../src/main/domain/clip'

describe('clip', () => {
  it('nombra el recorte con el tramo y sin dos puntos', () => {
    expect(clipStamp(90)).toBe('01m30s')
    expect(clipStamp(3723.9)).toBe('1h02m03s')
    expect(clipFileName('charla.mp4', 90, 300, 'mp4')).toBe('charla (01m30s-05m00s).mp4')
    expect(clipFileName('charla.mp4', 90, 300, 'mp4', 2)).toBe('charla (01m30s-05m00s) (2).mp4')
  })

  it('copia con la extensión del original y recodifica a mp4 o mp3', () => {
    expect(clipExtension('a.MKV', 'copy', true)).toBe('mkv')
    expect(clipExtension('a.mkv', 'encode', true)).toBe('mp4')
    expect(clipExtension('a.ogg', 'encode', false)).toBe('mp3')
  })

  it('valida el tramo', () => {
    expect(isValidClipRange(0, 10, 60)).toBe(true)
    expect(isValidClipRange(10, 10.2, 60)).toBe(false)
    expect(isValidClipRange(-1, 10, 60)).toBe(false)
    expect(isValidClipRange(70, 80, 60)).toBe(false)
    expect(isValidClipRange(70, 80, 0)).toBe(true)
  })

  it('busca antes de -i y copia las pistas tal cual', () => {
    const args = clipArgs('in.mp4', 'out.mp4', 1.5, 4, 'copy', true)
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(args).toEqual(expect.arrayContaining(['-t', '2.500', '-c', 'copy']))
    expect(args.at(-1)).toBe('out.mp4')
    expect(clipArgs('in.wav', 'o.mp3', 0, 1, 'encode', false)).toContain('libmp3lame')
  })
})

describe('PeakAccumulator', () => {
  const pcm = (...values: number[]): Uint8Array => {
    const buf = new Uint8Array(values.length * 2)
    const view = new DataView(buf.buffer)
    values.forEach((v, i) => view.setInt16(i * 2, v, true))
    return buf
  }

  it('saca el pico de cada barra, normalizado', () => {
    // 4 muestras en 2 barras de 2.
    const acc = new PeakAccumulator(2, 4, 1)
    acc.push(pcm(100, -400, 0, 25))
    expect(acc.result()).toEqual([1, 0.25])
  })

  it('aguanta trozos que parten una muestra', () => {
    const acc = new PeakAccumulator(1, 2, 1)
    const data = pcm(-1000, 500)
    acc.push(data.subarray(0, 1))
    acc.push(data.subarray(1))
    expect(acc.result()).toEqual([1])
  })

  it('el silencio da todo ceros', () => {
    const acc = new PeakAccumulator(3, 3, 1)
    acc.push(pcm(0, 0, 0))
    expect(acc.result()).toEqual([0, 0, 0])
  })
})
