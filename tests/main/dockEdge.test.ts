import { describe, expect, it } from 'vitest'
import { DOCK_POSITIONS } from '@shared/dock'
import {
  BAR_PX,
  contains,
  CORNER_GAP_PX,
  dockBounds,
  MARGIN_PX,
  PEEK_PX,
  tuckedBounds,
  type Area
} from '../../src/main/domain/dock/edge'

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const PILL = 110

const middle = (bounds: { y: number; height: number }): number => bounds.y + bounds.height / 2
const inside = (inner: Area, outer: Area): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

describe('dockBounds en el borde derecho', () => {
  it('es una barra fina pegada al borde mientras está escondido', () => {
    expect(dockBounds(AREA, null, 'right')).toMatchObject({
      x: 1920 - PEEK_PX,
      width: PEEK_PX,
      height: BAR_PX
    })
  })

  it('saca la píldora entera a la pantalla', () => {
    const out = dockBounds(AREA, PILL, 'right')
    expect(out).toMatchObject({ width: PILL + MARGIN_PX, height: BAR_PX })
    expect(out.x + out.width).toBe(1920)
  })

  it('la ventana es tan alta como la barra: el ratón nunca queda fuera', () => {
    expect(dockBounds(AREA, PILL, 'right').y).toBe(dockBounds(AREA, null, 'right').y)
  })

  it('centra barra y píldora a la misma altura, dentro del área de trabajo', () => {
    const area = { x: -1280, y: 200, width: 1280, height: 984 }
    const hidden = dockBounds(area, null, 'right')
    const out = dockBounds(area, PILL, 'right')
    expect(Math.abs(middle(hidden) - middle(out))).toBeLessThanOrEqual(1)
    expect(hidden.y).toBeGreaterThanOrEqual(200)
    expect(hidden.y + hidden.height).toBeLessThanOrEqual(200 + 984)
    expect(hidden.x).toBe(-PEEK_PX)
  })
})

describe('dockBounds en otras posiciones', () => {
  it('en el borde izquierdo, pegado a la izquierda', () => {
    expect(dockBounds(AREA, null, 'left')).toMatchObject({ x: 0, width: PEEK_PX })
    expect(dockBounds(AREA, PILL, 'left')).toMatchObject({ x: 0, width: PILL + MARGIN_PX })
  })

  it('arriba, una barra horizontal pegada arriba; fuera, la píldora tumbada', () => {
    expect(dockBounds(AREA, null, 'topCenter')).toMatchObject({
      y: 0,
      width: BAR_PX,
      height: PEEK_PX
    })
    expect(dockBounds(AREA, PILL, 'topCenter')).toMatchObject({ y: 0, width: PILL, height: BAR_PX })
  })

  it('abajo, pegado al borde de abajo del área de trabajo', () => {
    const area = { x: 0, y: 0, width: 1920, height: 1032 }
    const hidden = dockBounds(area, null, 'bottomLeft')
    const out = dockBounds(area, PILL, 'bottomLeft')
    expect(hidden.y + hidden.height).toBe(1032)
    expect(out.y + out.height).toBe(1032)
  })

  it('en las esquinas deja libre la esquina; al centro, centrado', () => {
    expect(dockBounds(AREA, PILL, 'topLeft').x).toBe(CORNER_GAP_PX)
    const right = dockBounds(AREA, PILL, 'bottomRight')
    expect(right.x + right.width).toBe(1920 - CORNER_GAP_PX)
    const center = dockBounds(AREA, PILL, 'topCenter')
    expect(center.x + center.width / 2).toBe(960)
  })

  it.each(DOCK_POSITIONS)('%s: la barra escondida queda dentro del dock fuera', (position) => {
    const area = { x: -1280, y: 200, width: 1280, height: 984 }
    const hidden = dockBounds(area, null, position)
    expect(inside(hidden, dockBounds(area, PILL, position))).toBe(true)
    expect(inside(hidden, area)).toBe(true)
  })
})

describe('tuckedBounds', () => {
  const visible = (bounds: Area): Area => {
    const x = Math.max(bounds.x, AREA.x)
    const y = Math.max(bounds.y, AREA.y)
    const right = Math.min(bounds.x + bounds.width, AREA.x + AREA.width)
    const bottom = Math.min(bounds.y + bounds.height, AREA.y + AREA.height)
    return { x, y, width: right - x, height: bottom - y }
  }

  it.each(DOCK_POSITIONS)('%s: del tamaño del dock fuera y solo asoma la barra', (position) => {
    const tucked = tuckedBounds(AREA, PILL, position)
    const out = dockBounds(AREA, PILL, position)
    expect(tucked).toMatchObject({ width: out.width, height: out.height })
    expect(inside(dockBounds(AREA, null, position), visible(tucked))).toBe(true)
    expect(Math.min(visible(tucked).width, visible(tucked).height)).toBe(PEEK_PX)
  })

  it('en el borde derecho empieza donde la barra', () => {
    expect(tuckedBounds(AREA, PILL, 'right').x).toBe(dockBounds(AREA, null, 'right').x)
  })
})

describe('contains', () => {
  const out = dockBounds(AREA, PILL, 'right')

  it('incluye los puntos del dock fuera, bordes de la pantalla incluidos', () => {
    expect(contains(out, { x: out.x, y: out.y })).toBe(true)
    expect(contains(out, { x: 1919, y: out.y + BAR_PX - 1 })).toBe(true)
  })

  it('deja fuera lo que pasa de sus límites', () => {
    expect(contains(out, { x: out.x - 1, y: out.y + 10 })).toBe(false)
    expect(contains(out, { x: 1919, y: out.y + BAR_PX })).toBe(false)
  })
})
