import { describe, expect, it } from 'vitest'
import {
  LineSplitter,
  parseDetectedLanguage,
  parseProgress,
  parseSegmentLine
} from '../../src/main/domain/parsers'

describe('parseSegmentLine', () => {
  it('parsea una línea normal a segundos', () => {
    expect(parseSegmentLine('[00:00:00.000 --> 00:00:05.120]  Hola mundo')).toEqual({
      start: 0,
      end: 5.12,
      text: 'Hola mundo'
    })
  })

  it('conserva acentos y ñ', () => {
    expect(parseSegmentLine('[00:00:01.000 --> 00:00:02.000]  Señor, ¿cómo estás?')).toEqual({
      start: 1,
      end: 2,
      text: 'Señor, ¿cómo estás?'
    })
  })

  it('acepta texto vacío', () => {
    expect(parseSegmentLine('[00:00:01.000 --> 00:00:02.000]  ')).toEqual({
      start: 1,
      end: 2,
      text: ''
    })
    expect(parseSegmentLine('[00:00:01.000 --> 00:00:02.000]')).toEqual({
      start: 1,
      end: 2,
      text: ''
    })
  })

  it('soporta tiempos de más de una hora', () => {
    expect(parseSegmentLine('[01:02:03.456 --> 01:02:10.000]  texto largo')).toEqual({
      start: 3723.456,
      end: 3730,
      text: 'texto largo'
    })
    // whisper.cpp no acota las horas a 2 dígitos si el audio dura más de 100 h.
    expect(parseSegmentLine('[123:00:00.000 --> 123:00:01.000]  x')).toEqual({
      start: 442800,
      end: 442801,
      text: 'x'
    })
  })

  it('recorta espacios sobrantes alrededor del texto', () => {
    expect(parseSegmentLine('[00:00:00.000 --> 00:00:01.000]    con espacios   ')).toEqual({
      start: 0,
      end: 1,
      text: 'con espacios'
    })
  })

  it('devuelve null para basura o líneas que no son segmentos', () => {
    expect(parseSegmentLine('')).toBeNull()
    expect(parseSegmentLine('whisper_print_progress_callback: progress = 50%')).toBeNull()
    expect(parseSegmentLine('[00:00:00 --> 00:00:01] falta el milisegundo')).toBeNull()
    expect(parseSegmentLine('texto suelto sin corchetes')).toBeNull()
    expect(parseSegmentLine('[00:00:01.000 -> 00:00:02.000] flecha incompleta')).toBeNull()
  })
})

describe('parseProgress', () => {
  it('lee el porcentaje de la línea real de whisper-cli', () => {
    expect(parseProgress('whisper_print_progress_callback: progress = 45%')).toBe(45)
    expect(parseProgress('progress = 0%')).toBe(0)
    expect(parseProgress('progress = 100%')).toBe(100)
  })

  it('devuelve null si la línea no trae progreso', () => {
    expect(parseProgress('')).toBeNull()
    expect(parseProgress('[00:00:00.000 --> 00:00:01.000]  texto')).toBeNull()
    expect(parseProgress('whisper_init_from_file: loading model')).toBeNull()
  })
})

describe('parseDetectedLanguage', () => {
  it('lee el idioma detectado', () => {
    expect(
      parseDetectedLanguage('whisper_full_with_state: auto-detected language: es (p = 0.987654)')
    ).toBe('es')
    expect(parseDetectedLanguage('auto-detected language: EN (p = 0.5)')).toBe('en')
  })

  it('devuelve null si la línea no lo trae', () => {
    expect(parseDetectedLanguage('progress = 50%')).toBeNull()
    expect(parseDetectedLanguage('')).toBeNull()
  })
})

describe('LineSplitter', () => {
  it('separa varias líneas de un mismo chunk', () => {
    const lines: string[] = []
    const splitter = new LineSplitter((l) => lines.push(l))
    splitter.push(Buffer.from('línea 1\nlínea 2\r\nlínea 3\n', 'utf8'))
    expect(lines).toEqual(['línea 1', 'línea 2', 'línea 3'])
  })

  it('junta una línea partida entre dos chunks', () => {
    const lines: string[] = []
    const splitter = new LineSplitter((l) => lines.push(l))
    splitter.push(Buffer.from('[00:00:00.000 --> 00:00:01.', 'utf8'))
    splitter.push(Buffer.from('000]  texto\n', 'utf8'))
    expect(lines).toEqual(['[00:00:00.000 --> 00:00:01.000]  texto'])
  })

  it('no rompe un carácter UTF-8 multibyte partido justo entre dos chunks', () => {
    const lines: string[] = []
    const splitter = new LineSplitter((l) => lines.push(l))
    const full = Buffer.from('Señor ñandú\n', 'utf8')
    // 'ñ' ocupa 2 bytes en UTF-8; se parte el chunk justo en medio de uno de ellos.
    const cut = full.indexOf(Buffer.from('ñ', 'utf8')) + 1
    splitter.push(full.subarray(0, cut))
    splitter.push(full.subarray(cut))
    expect(lines).toEqual(['Señor ñandú'])
  })

  it('entrega la última línea sin salto final al hacer flush', () => {
    const lines: string[] = []
    const splitter = new LineSplitter((l) => lines.push(l))
    splitter.push(Buffer.from('sin salto de línea al final'))
    expect(lines).toEqual([])
    splitter.flush()
    expect(lines).toEqual(['sin salto de línea al final'])
  })

  it('ignora basura sin romper el resto del stream', () => {
    const lines: string[] = []
    const splitter = new LineSplitter((l) => lines.push(l))
    splitter.push(Buffer.from('\x00\x01basura\n[00:00:00.000 --> 00:00:01.000]  ok\n'))
    expect(lines[1]).toBe('[00:00:00.000 --> 00:00:01.000]  ok')
    expect(parseSegmentLine(lines[0])).toBeNull()
    expect(parseSegmentLine(lines[1])).toEqual({ start: 0, end: 1, text: 'ok' })
  })
})
