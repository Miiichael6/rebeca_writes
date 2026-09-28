import { describe, expect, it } from 'vitest'
import {
  exportTranscript,
  hasSiblingSrt,
  lrcTimestamp,
  srtFileName,
  srtLanguage,
  srtTimestamp,
  toLrc,
  toSrt,
  toTxt,
  toTxtTimestamps,
  toVtt,
  txtTimestamp,
  vttTimestamp
} from '@shared/exporters'
import type { Segment } from '@shared/types'

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text })

describe('srtTimestamp', () => {
  it('formatea hh:mm:ss,mmm', () => {
    expect(srtTimestamp(0)).toBe('00:00:00,000')
    expect(srtTimestamp(3723.456)).toBe('01:02:03,456')
  })

  it('redondea a milisegundos antes de partir', () => {
    expect(srtTimestamp(1.9999)).toBe('00:00:02,000')
    expect(srtTimestamp(59.9996)).toBe('00:01:00,000')
    expect(srtTimestamp(1.43)).toBe('00:00:01,430')
  })

  it('no da tiempos negativos', () => {
    expect(srtTimestamp(-1)).toBe('00:00:00,000')
  })
})

describe('vttTimestamp', () => {
  it('usa punto como separador de milisegundos', () => {
    expect(vttTimestamp(1.43)).toBe('00:00:01.430')
    expect(vttTimestamp(3600 * 12 + 0.0005)).toBe('12:00:00.001')
  })
})

describe('lrcTimestamp', () => {
  it('mm:ss.xx con centésimas redondeadas', () => {
    expect(lrcTimestamp(0)).toBe('00:00.00')
    expect(lrcTimestamp(65.432)).toBe('01:05.43')
    expect(lrcTimestamp(1.996)).toBe('00:02.00')
  })

  it('no pasa a horas: los minutos siguen contando', () => {
    expect(lrcTimestamp(3600 + 62.5)).toBe('61:02.50')
    expect(lrcTimestamp(6000)).toBe('100:00.00')
  })
})

describe('txtTimestamp', () => {
  it('mm:ss y h:mm:ss desde la primera hora', () => {
    expect(txtTimestamp(0)).toBe('00:00')
    expect(txtTimestamp(59.9)).toBe('00:59')
    expect(txtTimestamp(3725)).toBe('1:02:05')
  })
})

describe('toSrt', () => {
  it('numera los segmentos con texto y salta los vacíos', () => {
    const srt = toSrt([seg(0, 1.5, ' Hola '), seg(1.5, 2, '   '), seg(2, 3.25, 'mundo')])
    expect(srt).toBe(
      '1\n00:00:00,000 --> 00:00:01,500\nHola\n\n2\n00:00:02,000 --> 00:00:03,250\nmundo\n'
    )
  })

  it('pasa de la hora', () => {
    expect(toSrt([seg(3725.1, 3727, 'tarde')])).toBe('1\n01:02:05,100 --> 01:02:07,000\ntarde\n')
  })

  it('texto multilínea: conserva los saltos pero no deja líneas en blanco dentro del bloque', () => {
    expect(toSrt([seg(0, 1, 'uno\r\n\r\n  dos  \n')])).toBe(
      '1\n00:00:00,000 --> 00:00:01,000\nuno\ndos\n'
    )
  })

  it('no toca caracteres especiales', () => {
    expect(toSrt([seg(0, 1, 'Ñandú & <b>¿qué?</b> 日本')])).toContain('Ñandú & <b>¿qué?</b> 日本')
  })
})

describe('toVtt', () => {
  it('cabecera WEBVTT y bloques con punto', () => {
    expect(toVtt([seg(0, 1.43, 'Hola'), seg(1.43, 4, 'mundo')])).toBe(
      'WEBVTT\n\n00:00:00.000 --> 00:00:01.430\nHola\n\n00:00:01.430 --> 00:00:04.000\nmundo\n'
    )
  })

  it('escapa &, < y > y no deja "-->" en el texto', () => {
    expect(toVtt([seg(0, 1, 'a & b <i> c --> d')])).toBe(
      'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\na &amp; b &lt;i&gt; c --&gt; d\n'
    )
  })

  it('sin segmentos sigue siendo un VTT válido', () => {
    expect(toVtt([])).toBe('WEBVTT\n')
  })
})

describe('toLrc', () => {
  it('una línea por segmento, el texto multilínea se junta', () => {
    expect(toLrc([seg(0, 1, 'Hola'), seg(3661.237, 3663, 'uno\ndos'), seg(4000, 4001, ' ')])).toBe(
      '[00:00.00]Hola\n[61:01.24]uno dos\n'
    )
  })
})

describe('toTxtTimestamps', () => {
  it('[mm:ss] texto, [h:mm:ss] desde la hora', () => {
    expect(toTxtTimestamps([seg(5, 6, ' Hola '), seg(3600, 3601, 'uno\ndos')])).toBe(
      '[00:05] Hola\n[1:00:00] uno dos\n'
    )
  })
})

describe('toTxt', () => {
  const segments = [
    seg(0, 1, 'Hola.'),
    seg(1, 2, 'Qué tal.'),
    // Pausa larga: párrafo nuevo con "Unir líneas".
    seg(10, 11, 'Adiós.')
  ]

  it('sin unir: un segmento por línea, sin marcas', () => {
    expect(toTxt(segments, { joined: false })).toBe('Hola.\nQué tal.\nAdiós.\n')
  })

  it('unido: párrafos separados por una línea en blanco', () => {
    expect(toTxt(segments, { joined: true })).toBe('Hola. Qué tal.\n\nAdiós.\n')
  })

  it('vacío', () => {
    expect(toTxt([], { joined: false })).toBe('')
  })
})

describe('exportTranscript', () => {
  it('elige el formato', () => {
    const segments = [seg(0, 1, 'Hola')]
    expect(exportTranscript('srt', segments)).toBe(toSrt(segments))
    expect(exportTranscript('vtt', segments)).toBe(toVtt(segments))
    expect(exportTranscript('lrc', segments)).toBe(toLrc(segments))
    expect(exportTranscript('txt', segments, { joined: true })).toBe(
      toTxt(segments, { joined: true })
    )
    expect(exportTranscript('txtTimestamps', segments)).toBe(toTxtTimestamps(segments))
  })
})

describe('srtFileName', () => {
  it('quita solo la última extensión y agrega el idioma', () => {
    expect(srtFileName('clase.01.mp4', 'es')).toBe('clase.01.es.srt')
    expect(srtFileName('audio', 'en')).toBe('audio.en.srt')
  })
})

describe('srtLanguage', () => {
  it('en si se tradujo; si no, el elegido o el detectado', () => {
    expect(srtLanguage({ language: 'es', translate: true })).toBe('en')
    expect(srtLanguage({ language: 'es', detectedLanguage: 'fr' })).toBe('es')
    expect(srtLanguage({ language: 'auto', detectedLanguage: 'pt' })).toBe('pt')
    expect(srtLanguage({ language: 'auto' })).toBe('und')
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
