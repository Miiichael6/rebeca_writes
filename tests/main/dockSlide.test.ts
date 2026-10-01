import { describe, expect, it } from 'vitest'
import { slidePath, slidePoints } from '../../src/main/domain/dock/slide'

describe('slidePath', () => {
  it('termina justo en el destino', () => {
    const path = slidePath(1914, 1740, 8)
    expect(path).toHaveLength(8)
    expect(path.at(-1)).toBe(1740)
  })

  it('va siempre en el mismo sentido', () => {
    const path = slidePath(0, 100, 6)
    expect(path.every((x, index) => index === 0 || x >= path[index - 1])).toBe(true)
  })
})

describe('slidePoints', () => {
  it('mueve solo el eje que cambia y acaba en el destino', () => {
    const points = slidePoints({ x: 800, y: -42 }, { x: 800, y: 0 })
    expect(points.every((point) => point.x === 800)).toBe(true)
    expect(points.at(-1)).toEqual({ x: 800, y: 0 })
  })
})
