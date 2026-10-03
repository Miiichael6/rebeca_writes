import { describe, expect, it } from 'vitest'
import { whisperArgs } from '../../src/main/domain/whisperArgs'

const base = { model: 'm.bin', wav: 'a.wav', language: 'es' }

/** Valor que sigue a `flag` en los argumentos, o `undefined` si no está. */
function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

describe('whisperArgs', () => {
  it('siempre pasa los umbrales exigentes y sin contexto previo', () => {
    const args = whisperArgs(base)
    expect(valueOf(args, '-mc')).toBe('0')
    expect(valueOf(args, '-et')).toBe('2.6')
    expect(args).not.toContain('-lpt')
  })

  it('activa el filtro de voz con el modelo dado', () => {
    const args = whisperArgs({ ...base, vadModel: 'C:\\vad\\silero.bin' })
    expect(args).toContain('--vad')
    expect(valueOf(args, '-vm')).toBe('C:\\vad\\silero.bin')
    expect(valueOf(args, '-vmsd')).toBe('15')
  })

  it('sin modelo de voz no pasa el filtro', () => {
    const args = whisperArgs(base)
    expect(args).not.toContain('--vad')
    expect(args).not.toContain('-vm')
    expect(args).not.toContain('-vmsd')
  })

  it('añade las opciones de Configuración', () => {
    const args = whisperArgs({
      ...base,
      translate: true,
      options: { prompt: 'hola', maxLen: 40, suppressNst: true, threads: 4 }
    })
    expect(valueOf(args, '--prompt')).toBe('hola')
    expect(valueOf(args, '-ml')).toBe('40')
    expect(valueOf(args, '-t')).toBe('4')
    expect(args).toContain('--suppress-nst')
    expect(args).toContain('-tr')
  })
})
