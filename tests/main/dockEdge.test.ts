import { describe, expect, it } from 'vitest'
import { DOCK_POSITIONS } from '@shared/dock'
import {
  BAR_PX,
  contains,
  CORNER_GAP_PX,
  dockBounds,
  PEEK_PX,
  tuckedBounds,
  type Area
} from '../../src/main/domain/dock/edge'

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const PILL = 110

const center = (bounds: Area): number => bounds.x + bounds.width / 2
const inside = (inner: Area, outer: Area): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

describe('dockBounds', () => {
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
    expect(dockBounds(AREA, null, 'topLeft').x).toBe(CORNER_GAP_PX)
    const right = dockBounds(AREA, null, 'bottomRight')
    expect(right.x + right.width).toBe(1920 - CORNER_GAP_PX)
    expect(center(dockBounds(AREA, PILL, 'topCenter'))).toBe(960)
  })

  it.each(DOCK_POSITIONS)('%s: la píldora sale centrada sobre la barra', (position) => {
    const hidden = dockBounds(AREA, null, position)
    const out = dockBounds(AREA, PILL, position)
    expect(Math.abs(center(hidden) - center(out))).toBeLessThanOrEqual(1)
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
    expect(visible(tucked).height).toBe(PEEK_PX)
  })

  it('abajo empieza donde la barra', () => {
    expect(tuckedBounds(AREA, PILL, 'bottomCenter').y).toBe(
      dockBounds(AREA, null, 'bottomCenter').y
    )
  })
})

describe('contains', () => {
  const out = dockBounds(AREA, PILL, 'bottomCenter')

  it('incluye los puntos del dock fuera, bordes de la pantalla incluidos', () => {
    expect(contains(out, { x: out.x, y: out.y })).toBe(true)
    expect(contains(out, { x: out.x + PILL - 1, y: 1039 })).toBe(true)
  })

  it('deja fuera lo que pasa de sus límites', () => {
    expect(contains(out, { x: out.x - 1, y: out.y + 10 })).toBe(false)
    expect(contains(out, { x: out.x + PILL, y: 1039 })).toBe(false)
  })
})
