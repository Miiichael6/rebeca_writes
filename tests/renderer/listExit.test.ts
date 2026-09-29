import { describe, expect, it } from 'vitest'
import { mergeExiting, settled } from '@renderer/lib/listExit'

interface Row {
  id: string
}

const row = (id: string): Row => ({ id })
const keyOf = (r: Row): string => r.id
const ids = (rows: readonly Row[]): string[] => rows.map(keyOf)

describe('listExit', () => {
  it('sin bajas no marca nada y usa la lista nueva', () => {
    const next = [row('a'), row('b')]
    expect(mergeExiting([row('a')], next, keyOf)).toEqual(settled(next))
  })

  it('conserva la fila quitada en su posición y la marca como saliente', () => {
    const prev = [row('a'), row('b'), row('c')]
    const result = mergeExiting(prev, [row('a'), row('c')], keyOf)
    expect(ids(result.items)).toEqual(['a', 'b', 'c'])
    expect([...result.exiting]).toEqual(['b'])
  })

  it('una segunda baja se acumula con la que ya estaba saliendo', () => {
    const first = mergeExiting([row('a'), row('b'), row('c')], [row('a'), row('c')], keyOf)
    const second = mergeExiting(first.items, [row('a')], keyOf)
    expect(ids(second.items)).toEqual(['a', 'b', 'c'])
    expect([...second.exiting].sort()).toEqual(['b', 'c'])
  })

  it('si el elemento vuelve antes de irse, deja de estar saliendo', () => {
    const exiting = mergeExiting([row('a'), row('b')], [row('a')], keyOf)
    const back = mergeExiting(exiting.items, [row('a'), row('b')], keyOf)
    expect(back.exiting.size).toBe(0)
    expect(ids(back.items)).toEqual(['a', 'b'])
  })

  it('toma los datos nuevos de los que siguen vivos', () => {
    const updated = [{ id: 'a', progress: 50 }]
    const result = mergeExiting([{ id: 'a', progress: 10 }], updated, (r) => r.id)
    expect(result.items).toEqual(updated)
  })

  it('vaciar la lista deja a todos saliendo, en orden', () => {
    const result = mergeExiting([row('a'), row('b')], [], keyOf)
    expect(ids(result.items)).toEqual(['a', 'b'])
    expect([...result.exiting]).toEqual(['a', 'b'])
  })
})
