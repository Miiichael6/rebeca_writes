import { describe, expect, it } from 'vitest'
import { formatClock, formatTimestamp } from '@renderer/lib/time'

describe('formatTimestamp', () => {
  it('usa mm:ss y pasa a h:mm:ss desde la primera hora', () => {
    expect(formatTimestamp(0)).toBe('00:00')
    expect(formatTimestamp(65.9)).toBe('01:05')
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(-3)).toBe('00:00')
  })
})

describe('formatClock', () => {
  it('usa m:ss y pasa a h:mm:ss desde la primera hora', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(605)).toBe('10:05')
    expect(formatClock(3725)).toBe('1:02:05')
  })
})
