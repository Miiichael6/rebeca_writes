import { describe, expect, it } from 'vitest'
import { clipRangeError, parseClock } from '../../src/renderer/src/components/Player/domain/clip'

describe('parseClock', () => {
  it('lee ss, m:ss y h:mm:ss con decimales', () => {
    expect(parseClock('45')).toBe(45)
    expect(parseClock('1:30')).toBe(90)
    expect(parseClock(' 1:02:03 ')).toBe(3723)
    expect(parseClock('1:02,5')).toBe(62.5)
  })

  it('rechaza lo que no es un tiempo', () => {
    expect(parseClock('')).toBeNull()
    expect(parseClock('1:75')).toBeNull()
    expect(parseClock('a:10')).toBeNull()
    expect(parseClock('1:2:3:4')).toBeNull()
  })
})

describe('clipRangeError', () => {
  it('explica qué falla', () => {
    expect(clipRangeError(null, 10, 60)).toBe('format')
    expect(clipRangeError(10, 5, 60)).toBe('order')
    expect(clipRangeError(70, 80, 60)).toBe('beyond')
    expect(clipRangeError(0, 30, 60)).toBeNull()
  })
})
