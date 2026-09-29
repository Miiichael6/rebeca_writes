import { describe, expect, it } from 'vitest'
import { extendRecent, isRecent, NO_RECENT } from '@renderer/lib/recentItems'

const DURATION = 167
const MAX_BURST = 40

describe('recentItems', () => {
  it('marca como recientes solo los índices que acaban de llegar', () => {
    const w = extendRecent(NO_RECENT, 10, 12, 1000, DURATION, MAX_BURST)
    expect(isRecent(w, 9)).toBe(false)
    expect(isRecent(w, 10)).toBe(true)
    expect(isRecent(w, 11)).toBe(true)
    expect(isRecent(w, 12)).toBe(false)
  })

  it('la ventana caduca cuando acaba la animación', () => {
    expect(extendRecent(NO_RECENT, 0, 2, 1000, DURATION, MAX_BURST).expires).toBe(1000 + DURATION)
  })

  it('varias llegadas seguidas amplían la misma ventana', () => {
    const first = extendRecent(NO_RECENT, 10, 11, 1000, DURATION, MAX_BURST)
    const second = extendRecent(first, 11, 12, 1050, DURATION, MAX_BURST)
    expect(isRecent(second, 10)).toBe(true)
    expect(isRecent(second, 11)).toBe(true)
  })

  it('tras caducar, la ventana arranca de nuevo en la última llegada', () => {
    const first = extendRecent(NO_RECENT, 10, 11, 1000, DURATION, MAX_BURST)
    const later = extendRecent(first, 11, 12, 5000, DURATION, MAX_BURST)
    expect(isRecent(later, 10)).toBe(false)
    expect(isRecent(later, 11)).toBe(true)
  })

  it('cargar la lista entera de golpe no anima nada', () => {
    expect(extendRecent(NO_RECENT, 0, 5000, 1000, DURATION, MAX_BURST)).toEqual(NO_RECENT)
  })

  it('una lista que se vacía o se sustituye tampoco anima', () => {
    expect(extendRecent(NO_RECENT, 100, 0, 1000, DURATION, MAX_BURST)).toEqual(NO_RECENT)
  })
})
