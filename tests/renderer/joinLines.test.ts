import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import { endsSentence, paragraphOf, paragraphText, toParagraphs } from '@shared/joinLines'
import { transcriptText } from '@renderer/lib/transcriptText'

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text })

describe('endsSentence', () => {
  it('reconoce los finales de frase', () => {
    expect(endsSentence('Hola.')).toBe(true)
    expect(endsSentence('¿Qué tal? ')).toBe(true)
    expect(endsSentence('¡Vamos!')).toBe(true)
    expect(endsSentence('y entonces…')).toBe(true)
    expect(endsSentence('dijo "basta."')).toBe(true)
    expect(endsSentence('(fin.)')).toBe(true)
    expect(endsSentence('你好。')).toBe(true)
  })

  it('no cuenta comas ni frases a medias', () => {
    expect(endsSentence('y luego,')).toBe(false)
    expect(endsSentence('sin punto')).toBe(false)
    expect(endsSentence('')).toBe(false)
  })
})

describe('toParagraphs', () => {
  it('sin segmentos no hay párrafos', () => {
    expect(toParagraphs([])).toEqual([])
  })

  it('une segmentos seguidos en un párrafo con el start del primero', () => {
    const segments = [seg(1, 2, 'Hola'), seg(2, 3, 'a todos,'), seg(3.5, 4, 'bienvenidos.')]
    expect(toParagraphs(segments)).toEqual([{ start: 1, end: 4, from: 0, to: 3 }])
  })

  it('corta en una pausa larga', () => {
    const segments = [seg(0, 1, 'uno'), seg(1.5, 2, 'dos'), seg(4, 5, 'tres')]
    expect(toParagraphs(segments)).toEqual([
      { start: 0, end: 2, from: 0, to: 2 },
      { start: 4, end: 5, from: 2, to: 3 }
    ])
  })

  it('la pausa justo en el umbral también corta', () => {
    const segments = [seg(0, 1, 'uno'), seg(3, 4, 'dos')]
    expect(toParagraphs(segments, { pauseSec: 2 })).toHaveLength(2)
    expect(toParagraphs(segments, { pauseSec: 2.5 })).toHaveLength(1)
  })

  it('corta cada N frases', () => {
    const segments = [
      seg(0, 1, 'Uno.'),
      seg(1, 2, 'Dos,'),
      seg(2, 3, 'tres.'),
      seg(3, 4, 'Cuatro.'),
      seg(4, 5, 'Cinco.')
    ]
    expect(toParagraphs(segments, { maxSentences: 2 }).map((p) => [p.from, p.to])).toEqual([
      [0, 3],
      [3, 5]
    ])
  })

  it('un segmento a medias de frase no cierra el párrafo aunque se llegue a N', () => {
    const segments = [seg(0, 1, 'Uno.'), seg(1, 2, 'y dos'), seg(2, 3, 'siguen.')]
    expect(toParagraphs(segments, { maxSentences: 1 }).map((p) => [p.from, p.to])).toEqual([
      [0, 1],
      [1, 3]
    ])
  })

  it('cada segmento pertenece a exactamente un párrafo', () => {
    const segments = Array.from({ length: 500 }, (_, i) =>
      seg(i * 1.5 + (i % 37 === 0 ? 3 : 0), i * 1.5 + 1, i % 4 === 3 ? 'fin.' : 'texto')
    )
    const paragraphs = toParagraphs(segments)
    expect(paragraphs[0].from).toBe(0)
    expect(paragraphs.at(-1)?.to).toBe(segments.length)
    for (let i = 1; i < paragraphs.length; i++) {
      expect(paragraphs[i].from).toBe(paragraphs[i - 1].to)
    }
  })
})

describe('paragraphText', () => {
  it('recorta y une con un espacio, saltando los vacíos', () => {
    const segments = [seg(0, 1, ' Hola'), seg(1, 2, '  '), seg(2, 3, 'mundo. ')]
    const [p] = toParagraphs(segments)
    expect(paragraphText(segments, p)).toBe('Hola mundo.')
  })
})

describe('paragraphOf', () => {
  const paragraphs = toParagraphs([
    seg(0, 1, 'a'),
    seg(1, 2, 'b'),
    seg(5, 6, 'c'),
    seg(9, 10, 'd'),
    seg(10, 11, 'e')
  ])

  it('encuentra el párrafo de cada segmento', () => {
    expect([0, 1, 2, 3, 4].map((i) => paragraphOf(paragraphs, i))).toEqual([0, 0, 1, 2, 2])
  })

  it('fuera de rango devuelve -1', () => {
    expect(paragraphOf(paragraphs, 5)).toBe(-1)
    expect(paragraphOf(paragraphs, -1)).toBe(-1)
    expect(paragraphOf([], 0)).toBe(-1)
  })
})

describe('transcriptText', () => {
  const segments = [seg(1, 2, ' Hola.'), seg(2, 3, 'Qué tal.'), seg(65, 66, 'Otro tema.')]

  it('sin unir: una línea por segmento con su tiempo', () => {
    expect(transcriptText(segments, false)).toBe(
      '[00:01] Hola.\n[00:02] Qué tal.\n[01:05] Otro tema.'
    )
  })

  it('unidas: párrafos separados por una línea en blanco', () => {
    expect(transcriptText(segments, true)).toBe('Hola. Qué tal.\n\nOtro tema.')
  })

  it('sin segmentos, texto vacío', () => {
    expect(transcriptText([], true)).toBe('')
    expect(transcriptText([], false)).toBe('')
  })
})
