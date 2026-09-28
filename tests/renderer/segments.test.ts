import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import { findActiveSegment } from '@renderer/lib/segments'

const seg = (start: number, end: number): Segment => ({ start, end, text: `${start}` })

describe('findActiveSegment', () => {
  const segments = [seg(1, 3), seg(3, 5), seg(6, 8), seg(8.5, 10)]

  it('sin segmentos devuelve null', () => {
    expect(findActiveSegment([], 5)).toBeNull()
  })

  it('antes del primer segmento devuelve null', () => {
    expect(findActiveSegment(segments, 0)).toBeNull()
    expect(findActiveSegment(segments, 0.999)).toBeNull()
  })

  it('dentro de un segmento devuelve su índice', () => {
    expect(findActiveSegment(segments, 1)).toBe(0)
    expect(findActiveSegment(segments, 2.5)).toBe(0)
    expect(findActiveSegment(segments, 7)).toBe(2)
    expect(findActiveSegment(segments, 9.99)).toBe(3)
  })

  it('en el borde entre dos segmentos gana el que empieza', () => {
    expect(findActiveSegment(segments, 3)).toBe(1)
    expect(findActiveSegment(segments, 8.5)).toBe(3)
  })

  it('en un silencio mantiene el último que empezó', () => {
    expect(findActiveSegment(segments, 5.5)).toBe(1)
    expect(findActiveSegment(segments, 8.2)).toBe(2)
  })

  it('después del final devuelve el último', () => {
    expect(findActiveSegment(segments, 1000)).toBe(3)
  })

  it('funciona con listas largas', () => {
    const many = Array.from({ length: 100_000 }, (_, i) => seg(i * 2, i * 2 + 1.5))
    expect(findActiveSegment(many, 0)).toBe(0)
    expect(findActiveSegment(many, 123_457)).toBe(61_728)
    expect(findActiveSegment(many, 199_999)).toBe(99_999)
  })
})
