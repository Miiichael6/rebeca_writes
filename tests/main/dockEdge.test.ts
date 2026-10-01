import { describe, expect, it } from 'vitest'
import {
  BAR_PX,
  contains,
  dockBounds,
  MARGIN_PX,
  PEEK_PX,
  slidePath
} from '../../src/main/domain/dock/edge'

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const PILL = 110

const middle = (bounds: { y: number; height: number }): number => bounds.y + bounds.height / 2

describe('dockBounds', () => {
  it('es una barra fina pegada al borde mientras está escondido', () => {
    expect(dockBounds(AREA, null)).toMatchObject({
      x: 1920 - PEEK_PX,
      width: PEEK_PX,
      height: BAR_PX
    })
  })

  it('saca la píldora entera a la pantalla', () => {
    const out = dockBounds(AREA, PILL)
    expect(out).toMatchObject({ width: PILL + MARGIN_PX, height: BAR_PX })
    expect(out.x + out.width).toBe(1920)
  })

  it('la ventana es tan alta como la barra: el ratón nunca queda fuera', () => {
    expect(dockBounds(AREA, PILL).y).toBe(dockBounds(AREA, null).y)
  })

  it('centra barra y píldora a la misma altura, dentro del área de trabajo', () => {
    const area = { x: -1280, y: 200, width: 1280, height: 984 }
    const hidden = dockBounds(area, null)
    const out = dockBounds(area, PILL)
    expect(Math.abs(middle(hidden) - middle(out))).toBeLessThanOrEqual(1)
    expect(hidden.y).toBeGreaterThanOrEqual(200)
    expect(hidden.y + hidden.height).toBeLessThanOrEqual(200 + 984)
    expect(hidden.x).toBe(-PEEK_PX)
  })
})

describe('contains', () => {
  const out = dockBounds(AREA, PILL)

  it('incluye los puntos del dock fuera, bordes de la pantalla incluidos', () => {
    expect(contains(out, { x: out.x, y: out.y })).toBe(true)
    expect(contains(out, { x: 1919, y: out.y + BAR_PX - 1 })).toBe(true)
  })

  it('deja fuera lo que pasa de sus límites', () => {
    expect(contains(out, { x: out.x - 1, y: out.y + 10 })).toBe(false)
    expect(contains(out, { x: 1919, y: out.y + BAR_PX })).toBe(false)
  })
})

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
