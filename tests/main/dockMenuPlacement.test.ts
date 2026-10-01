import { describe, expect, it } from 'vitest'
import { menuBounds } from '../../src/main/domain/dock/menuPlacement'

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const SIZE = { width: 290, height: 150 }

describe('menuBounds', () => {
  it('abre a la izquierda del cursor y hacia abajo', () => {
    expect(menuBounds({ x: 1900, y: 700 }, SIZE, AREA)).toEqual({
      x: 1610,
      y: 700,
      width: 290,
      height: 150
    })
  })

  it('crecer conserva el borde derecho y el de arriba', () => {
    const narrow = menuBounds({ x: 1900, y: 700 }, SIZE, AREA)
    const wide = menuBounds({ x: 1900, y: 700 }, { width: 580, height: 200 }, AREA)
    expect(wide.x + wide.width).toBe(narrow.x + narrow.width)
    expect(wide.y).toBe(narrow.y)
  })

  it('sube si no cabe por abajo', () => {
    expect(menuBounds({ x: 1900, y: 1000 }, SIZE, AREA).y).toBe(1040 - 150)
  })

  it('no se sale por la izquierda ni por arriba de un monitor desplazado', () => {
    const area = { x: -1280, y: 200, width: 1280, height: 984 }
    expect(menuBounds({ x: -1200, y: 100 }, SIZE, area)).toMatchObject({ x: -1280, y: 200 })
  })
})
