import { describe, expect, it } from 'vitest'
import { hasSiblingSrt, srtFileName, srtTimestamp, toSrt } from '@shared/exporters'

describe('srtTimestamp', () => {
  it('formatea hh:mm:ss,mmm', () => {
    expect(srtTimestamp(0)).toBe('00:00:00,000')
    expect(srtTimestamp(3723.456)).toBe('01:02:03,456')
  })

  it('redondea a milisegundos antes de partir', () => {
    expect(srtTimestamp(1.9999)).toBe('00:00:02,000')
    expect(srtTimestamp(59.9996)).toBe('00:01:00,000')
  })

  it('no da tiempos negativos', () => {
    expect(srtTimestamp(-1)).toBe('00:00:00,000')
  })
})

describe('toSrt', () => {
  it('numera los segmentos con texto y salta los vacíos', () => {
    const srt = toSrt([
      { start: 0, end: 1.5, text: ' Hola ' },
      { start: 1.5, end: 2, text: '   ' },
      { start: 2, end: 3.25, text: 'mundo' }
    ])
    expect(srt).toBe(
      '1\n00:00:00,000 --> 00:00:01,500\nHola\n\n2\n00:00:02,000 --> 00:00:03,250\nmundo\n'
    )
  })
})

describe('srtFileName', () => {
  it('quita solo la última extensión y agrega el idioma', () => {
    expect(srtFileName('clase.01.mp4', 'es')).toBe('clase.01.es.srt')
    expect(srtFileName('audio', 'en')).toBe('audio.en.srt')
  })
})

describe('hasSiblingSrt', () => {
  it('reconoce <nombre>.srt y <nombre>.<idioma>.srt sin distinguir mayúsculas', () => {
    expect(hasSiblingSrt('Clase.mp4', ['clase.SRT'])).toBe(true)
    expect(hasSiblingSrt('clase.mp4', ['clase.es.srt'])).toBe(true)
  })

  it('no confunde otros archivos', () => {
    expect(hasSiblingSrt('clase.mp4', ['clase2.srt', 'clase.mp4', 'clase.es.txt'])).toBe(false)
  })
})
