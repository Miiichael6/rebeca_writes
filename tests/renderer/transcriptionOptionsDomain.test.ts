import { describe, expect, it } from 'vitest'
import {
  PROMPT_MAX_TOKENS,
  approxTokens,
  isPromptTooLong
} from '@renderer/components/settings/TranscriptionOptions/domain/options'

describe('approxTokens', () => {
  it('estima ~4 caracteres por token, redondeando hacia arriba', () => {
    expect(approxTokens('')).toBe(0)
    expect(approxTokens('abcd')).toBe(1)
    expect(approxTokens('abcde')).toBe(2)
  })
  it('ignora los espacios de los extremos', () => {
    expect(approxTokens('   abcd  \n')).toBe(1)
  })
})

describe('isPromptTooLong', () => {
  it('avisa solo por encima del límite', () => {
    expect(isPromptTooLong(PROMPT_MAX_TOKENS)).toBe(false)
    expect(isPromptTooLong(PROMPT_MAX_TOKENS + 1)).toBe(true)
  })
})
