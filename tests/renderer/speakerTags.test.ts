import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import { OWN_SPEAKER_ID } from '@shared/speakers'
import {
  SPEAKER_COLORS,
  speakerColor,
  speakerTurnAt,
  speakerTurnIn
} from '@renderer/components/TranscriptView/domain/speakers'

const talk: Segment[] = [
  { start: 0, end: 1, text: 'a', speaker: 'p1' },
  { start: 1, end: 2, text: 'b', speaker: 'p1' },
  { start: 2, end: 3, text: ' ' },
  { start: 3, end: 4, text: 'c', speaker: 'p2' },
  { start: 4, end: 5, text: 'd', speaker: 'p1' }
]

describe('speakerTurnAt', () => {
  it('la etiqueta solo aparece cuando cambia la voz', () => {
    expect(talk.map((_, i) => speakerTurnAt(talk, i))).toEqual(['p1', null, null, 'p2', 'p1'])
  })

  it('sin hablantes no hay etiquetas', () => {
    expect(speakerTurnAt([{ start: 0, end: 1, text: 'x' }], 0)).toBeNull()
  })
})

describe('speakerTurnIn', () => {
  it('mira el primer segmento con hablante del tramo', () => {
    expect(speakerTurnIn(talk, 2, 4)).toBe('p2')
    expect(speakerTurnIn(talk, 1, 3)).toBeNull()
  })
})

describe('speakerColor', () => {
  it('"Usted" tiene su color y las personas rotan por la paleta', () => {
    expect(speakerColor(OWN_SPEAKER_ID)).toBe(0)
    expect(speakerColor('p1')).toBe(1)
    expect(speakerColor(`p${SPEAKER_COLORS}`)).toBe(SPEAKER_COLORS)
    expect(speakerColor(`p${SPEAKER_COLORS + 1}`)).toBe(1)
  })
})
