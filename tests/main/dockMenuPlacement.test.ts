import { describe, expect, it } from 'vitest'
import { menuOpensLeft } from '@shared/dock'
import { menuBounds } from '../../src/main/domain/dock/menuPlacement'

const AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const SIZE = { width: 290, height: 150 }

describe('menuBounds', () => {
  it('abre a la izquierda del cursor y hacia abajo', () => {
    expect(menuBounds({ x: 1900, y: 700 }, SIZE, AREA, true)).toEqual({
      x: 1610,
      y: 700,
      width: 290,
      height: 150
    })
  })

  it('o a la derecha del cursor', () => {
    expect(menuBounds({ x: 20, y: 700 }, SIZE, AREA, false)).toMatchObject({ x: 20, y: 700 })
  })

  it('crecer conserva el borde del lado del cursor y el de arriba', () => {
    const wider = { width: 580, height: 200 }
    const narrow = menuBounds({ x: 1900, y: 700 }, SIZE, AREA, true)
    const wide = menuBounds({ x: 1900, y: 700 }, wider, AREA, true)
    expect(wide.x + wide.width).toBe(narrow.x + narrow.width)
    expect(wide.y).toBe(narrow.y)
    expect(menuBounds({ x: 20, y: 700 }, wider, AREA, false).x).toBe(20)
  })

  it('sube si no cabe por abajo', () => {
    expect(menuBounds({ x: 1900, y: 1000 }, SIZE, AREA, true).y).toBe(1040 - 150)
  })

  it('no se sale por ningún lado de un monitor desplazado', () => {
    const area = { x: -1280, y: 200, width: 1280, height: 984 }
    expect(menuBounds({ x: -1200, y: 100 }, SIZE, area, true)).toMatchObject({ x: -1280, y: 200 })
    expect(menuBounds({ x: -10, y: 300 }, SIZE, area, false).x).toBe(-290)
  })
})

describe('menuOpensLeft', () => {
  it('hacia dentro de la pantalla', () => {
    expect(menuOpensLeft('topRight')).toBe(true)
    expect(menuOpensLeft('bottomCenter')).toBe(true)
    expect(menuOpensLeft('topLeft')).toBe(false)
    expect(menuOpensLeft('bottomLeft')).toBe(false)
  })
})
