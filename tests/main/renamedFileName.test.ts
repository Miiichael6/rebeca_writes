import { describe, expect, it } from 'vitest'
import { renamedFileName } from '../../src/main/domain/history'

describe('renamedFileName', () => {
  it('conserva la extensión original', () => {
    expect(renamedFileName('clase 1.mp4', 'Introducción')).toBe('Introducción.mp4')
  })

  it('no duplica la extensión si el usuario ya la escribió', () => {
    expect(renamedFileName('clase.mp4', 'nueva.MP4')).toBe('nueva.mp4')
  })

  it('quita los caracteres que Windows no admite y los puntos o espacios finales', () => {
    expect(renamedFileName('a.wav', ' re:unión*/2?\\3 .. ')).toBe('reunión23.wav')
  })

  it('funciona con archivos sin extensión', () => {
    expect(renamedFileName('grabacion', 'audio')).toBe('audio')
  })

  it('rechaza nombres vacíos o reservados', () => {
    expect(renamedFileName('a.mp4', '  ')).toBeNull()
    expect(renamedFileName('a.mp4', '???')).toBeNull()
    expect(renamedFileName('a.mp4', 'CON')).toBeNull()
    expect(renamedFileName('a.mp4', '.mp4')).toBeNull()
  })
})
