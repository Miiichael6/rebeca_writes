import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import {
  findMatches,
  firstMatchAtOrAfter,
  normalize,
  normalizeWithMap,
  updateSearch
} from '@renderer/lib/search'

const seg = (text: string, start = 0): Segment => ({ start, end: start + 1, text })

/** Texto original de cada coincidencia, para comprobar que el mapa de índices acierta. */
function found(segments: Segment[], query: string): string[] {
  return findMatches(segments, query).map((m) =>
    segments[m.segmentIndex].text.slice(m.start, m.end)
  )
}

describe('normalize', () => {
  it('quita mayúsculas y tildes', () => {
    expect(normalize('Canción')).toBe('cancion')
    expect(normalize('ÁÉÍÓÚ Ü')).toBe('aeiou u')
    expect(normalize('Ñandú')).toBe('nandu')
    expect(normalize('São Paulo')).toBe('sao paulo')
  })

  it('acepta texto ya descompuesto (NFD)', () => {
    expect(normalize('Canción')).toBe('cancion')
  })
})

describe('normalizeWithMap', () => {
  it('cada carácter normalizado apunta a su carácter original', () => {
    const n = normalizeWithMap('Él')
    expect(n.text).toBe('el')
    expect(n.starts).toEqual([0, 1])
    expect(n.ends).toEqual([1, 2])
  })

  it('una tilde suelta (NFD) se queda en el carácter anterior', () => {
    const n = normalizeWithMap('éx')
    expect(n.text).toBe('ex')
    expect(n.starts).toEqual([0, 2])
  })

  it('los caracteres de dos unidades UTF-16 cuentan entero', () => {
    const n = normalizeWithMap('🎵a')
    expect(n.text).toBe('🎵a')
    expect(n.starts).toEqual([0, 0, 2])
    expect(n.ends).toEqual([2, 2, 3])
  })
})

describe('findMatches', () => {
  it('"cancion" encuentra "Canción" y "CANCIÓN"', () => {
    const segments = [seg('Una Canción nueva'), seg('otra cosa'), seg('LA CANCIÓN')]
    expect(findMatches(segments, 'cancion')).toEqual([
      { segmentIndex: 0, start: 4, end: 11 },
      { segmentIndex: 2, start: 3, end: 10 }
    ])
    expect(found(segments, 'cancion')).toEqual(['Canción', 'CANCIÓN'])
  })

  it('la consulta también se normaliza', () => {
    expect(found([seg('una cancion')], 'CANCIÓN')).toEqual(['cancion'])
  })

  it('ñ: coincide con Ñ y, sin diacríticos, con n', () => {
    const segments = [seg('El AÑO pasado'), seg('un ano')]
    expect(found(segments, 'año')).toEqual(['AÑO', 'ano'])
    expect(found(segments, 'ano')).toEqual(['AÑO', 'ano'])
  })

  it('varias coincidencias por segmento, sin solaparse', () => {
    expect(findMatches([seg('la la la')], 'la')).toEqual([
      { segmentIndex: 0, start: 0, end: 2 },
      { segmentIndex: 0, start: 3, end: 5 },
      { segmentIndex: 0, start: 6, end: 8 }
    ])
    expect(findMatches([seg('aaaa')], 'aa')).toHaveLength(2)
  })

  it('resalta el tramo original aunque tenga tildes descompuestas', () => {
    expect(found([seg('una canción')], 'cancion')).toEqual(['canción'])
  })

  it('consulta vacía o solo espacios no encuentra nada', () => {
    expect(findMatches([seg('hola')], '')).toEqual([])
    expect(findMatches([seg('hola')], '   ')).toEqual([])
  })

  it('ignora los espacios de los extremos de la consulta', () => {
    expect(found([seg('hola mundo')], ' mundo ')).toEqual(['mundo'])
  })

  it('empieza en `from`', () => {
    const segments = [seg('hola'), seg('hola'), seg('hola')]
    expect(findMatches(segments, 'hola', 1).map((m) => m.segmentIndex)).toEqual([1, 2])
  })

  it('miles de segmentos en poco tiempo', () => {
    const segments = Array.from({ length: 10_000 }, (_, i) =>
      seg(`Segmento número ${i} con una canción de prueba`, i)
    )
    const t0 = performance.now()
    expect(findMatches(segments, 'cancion')).toHaveLength(10_000)
    // Segunda búsqueda con el normalizado ya en caché.
    expect(findMatches(segments, 'numero 99')).toHaveLength(111)
    expect(performance.now() - t0).toBeLessThan(500)
  })
})

describe('updateSearch', () => {
  it('con segmentos añadidos al final solo busca en los nuevos', () => {
    const a = [seg('hola'), seg('adiós')]
    const first = updateSearch(null, a, 'hola')
    expect(first.matches).toHaveLength(1)

    const b = a.concat([seg('otra'), seg('hola otra vez')])
    const next = updateSearch(first, b, 'hola')
    expect(next.matches).toEqual([
      { segmentIndex: 0, start: 0, end: 4 },
      { segmentIndex: 3, start: 0, end: 4 }
    ])
    // Las coincidencias viejas se conservan tal cual.
    expect(next.matches[0]).toBe(first.matches[0])
  })

  it('sin cambios devuelve el mismo resultado', () => {
    const a = [seg('hola')]
    const first = updateSearch(null, a, 'hola')
    expect(updateSearch(first, a, 'hola')).toBe(first)
  })

  it('si llegan segmentos sin coincidencias conserva el mismo array', () => {
    const a = [seg('hola')]
    const first = updateSearch(null, a, 'hola')
    expect(updateSearch(first, a.concat([seg('nada')]), 'hola').matches).toBe(first.matches)
  })

  it('con otra consulta o una lista distinta vuelve a buscar en todo', () => {
    const a = [seg('hola'), seg('mundo')]
    const first = updateSearch(null, a, 'hola')
    expect(updateSearch(first, a, 'mundo').matches).toEqual([{ segmentIndex: 1, start: 0, end: 5 }])
    // Edición: misma longitud, un segmento nuevo en medio.
    const edited = [seg('adiós'), a[1]]
    expect(updateSearch(first, edited, 'hola').matches).toEqual([])
    // Otro archivo.
    expect(updateSearch(first, [seg('x hola')], 'hola').matches).toEqual([
      { segmentIndex: 0, start: 2, end: 6 }
    ])
  })
})

describe('firstMatchAtOrAfter', () => {
  const matches = findMatches([seg('a'), seg('b'), seg('a a'), seg('b'), seg('a')], 'a')

  it('encuentra la primera coincidencia de un segmento', () => {
    expect(firstMatchAtOrAfter(matches, 0)).toBe(0)
    expect(firstMatchAtOrAfter(matches, 2)).toBe(1)
    expect(firstMatchAtOrAfter(matches, 4)).toBe(3)
  })

  it('sin coincidencias en el segmento da la siguiente', () => {
    expect(firstMatchAtOrAfter(matches, 1)).toBe(1)
    expect(firstMatchAtOrAfter(matches, 3)).toBe(3)
    expect(firstMatchAtOrAfter(matches, 5)).toBe(4)
  })
})
