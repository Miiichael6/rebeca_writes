import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import { aiText, collapseRepeats, stripNonSpeech } from '../../src/renderer/src/lib/aiText'

const seg = (start: number, text: string, speaker?: string): Segment => ({
  start,
  end: start + 1,
  text,
  ...(speaker ? { speaker } : {})
})

describe('stripNonSpeech', () => {
  it('quita las marcas de no habla y los espacios de más', () => {
    expect(stripNonSpeech(' [BLANK_AUDIO]  hola (música)  mundo ♪ ')).toBe('hola mundo')
  })
})

describe('collapseRepeats', () => {
  it('deja una vez la palabra repetida más de 5 veces', () => {
    expect(collapseRepeats('dije no no no no no no y ya')).toBe('dije no y ya')
  })

  it('respeta hasta 5 repeticiones', () => {
    expect(collapseRepeats('no no no no no')).toBe('no no no no no')
  })

  it('detecta frases repetidas sin importar mayúsculas ni puntuación', () => {
    const loop = Array(8).fill('el almacenamiento,').join(' ')
    expect(collapseRepeats(`hablamos de ${loop} y nada más`)).toBe(
      'hablamos de el almacenamiento, y nada más'
    )
  })
})

describe('aiText', () => {
  it('con marcas de tiempo y sin segmentos de no habla', () => {
    const text = aiText([seg(0, 'Hola.'), seg(1, '[BLANK_AUDIO]'), seg(2, 'Qué tal.')])
    expect(text).toBe('[00:00] Hola.\n[00:02] Qué tal.')
  })

  it('colapsa rachas de segmentos iguales y de [BLANK_AUDIO]', () => {
    const loop = Array.from({ length: 10 }, (_, i) => seg(i + 1, 'Gracias por ver.'))
    const blanks = Array.from({ length: 10 }, (_, i) => seg(i + 11, '[BLANK_AUDIO]'))
    expect(aiText([seg(0, 'Fin.'), ...loop, ...blanks])).toBe(
      '[00:00] Fin.\n[00:01] Gracias por ver.'
    )
  })

  it('colapsa los bucles dentro de un segmento y conserva su marca de tiempo', () => {
    expect(aiText([seg(65, 'no no no no no no no vale')])).toBe('[01:05] no vale')
  })

  it('pone el nombre solo cuando cambia quien habla', () => {
    const names = { you: 'Usted', p1: 'Ana' }
    const text = aiText(
      [seg(0, 'Hola.', 'you'), seg(1, 'Hola.', 'p1'), seg(10, 'Sigo yo.', 'p1')],
      names
    )
    expect(text).toBe('[00:00] Usted: Hola.\n[00:01] Ana: Hola.\n[00:10] Sigo yo.')
  })
})
