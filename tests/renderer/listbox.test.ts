import { describe, expect, it } from 'vitest'
import { appendQuery, EMPTY_QUERY, matchPrefix, moveIndex } from '@renderer/lib/listbox'

const LABELS = ['Auto', 'Español', 'English', 'Português', 'Euskera']

describe('moveIndex', () => {
  it('las flechas se quedan en los extremos', () => {
    expect(moveIndex('ArrowDown', 1, 5)).toBe(2)
    expect(moveIndex('ArrowDown', 4, 5)).toBe(4)
    expect(moveIndex('ArrowUp', 1, 5)).toBe(0)
    expect(moveIndex('ArrowUp', 0, 5)).toBe(0)
  })

  it('sin opción activa, abajo va a la primera y arriba a la última', () => {
    expect(moveIndex('ArrowDown', -1, 5)).toBe(0)
    expect(moveIndex('ArrowUp', -1, 5)).toBe(4)
  })

  it('Home y End van a los extremos', () => {
    expect(moveIndex('Home', 3, 5)).toBe(0)
    expect(moveIndex('End', 0, 5)).toBe(4)
  })

  it('otras teclas y la lista vacía no mueven nada', () => {
    expect(moveIndex('Enter', 2, 5)).toBeNull()
    expect(moveIndex('ArrowDown', 0, 0)).toBeNull()
  })
})

describe('appendQuery', () => {
  it('acumula mientras se escribe seguido', () => {
    const first = appendQuery(EMPTY_QUERY, 'E', 1000)
    expect(appendQuery(first, 'n', 1200).text).toBe('en')
  })

  it('empieza de cero tras la pausa', () => {
    const first = appendQuery(EMPTY_QUERY, 'E', 1000)
    expect(appendQuery(first, 'n', 3000).text).toBe('n')
  })
})

describe('matchPrefix', () => {
  it('encuentra por prefijo sin distinguir mayúsculas', () => {
    expect(matchPrefix(LABELS, 'por', 0)).toBe(3)
  })

  it('una letra repetida recorre las opciones que empiezan por ella', () => {
    expect(matchPrefix(LABELS, 'e', 0)).toBe(1)
    expect(matchPrefix(LABELS, 'ee', 1)).toBe(2)
    expect(matchPrefix(LABELS, 'eee', 2)).toBe(4)
  })

  it('da la vuelta al llegar al final', () => {
    expect(matchPrefix(LABELS, 'a', 4)).toBe(0)
  })

  it('sin coincidencia o sin texto no mueve nada', () => {
    expect(matchPrefix(LABELS, 'zz', 0)).toBeNull()
    expect(matchPrefix(LABELS, '', 0)).toBeNull()
  })
})
