import { describe, expect, it } from 'vitest'
import { dictionaryParts, type DictionaryEntry } from '@shared/dictionary'
import { reapplyDictionary } from '@shared/reapplyDictionary'
import type { Segment } from '@shared/types'

const ENTRIES: DictionaryEntry[] = [
  { id: '1', spoken: ['jompas', 'jom pas'], written: 'home pass', plural: false, enabled: true },
  { id: '2', spoken: ['cua'], written: 'QA', plural: false, enabled: true }
]

const seg = (text: string, extra: Partial<Segment> = {}): Segment => ({
  start: 0,
  end: 1,
  text,
  ...extra
})

describe('dictionaryParts', () => {
  it('marca los trozos reemplazados y unidos dan el texto corregido', () => {
    expect(dictionaryParts('El jom pas, y cua.', ENTRIES)).toEqual([
      { text: 'El ', replaced: false },
      { text: 'home pass', replaced: true },
      { text: ', y ', replaced: false },
      { text: 'QA', replaced: true },
      { text: '.', replaced: false }
    ])
  })

  it('sin coincidencias devuelve el texto entero', () => {
    expect(dictionaryParts('nada', ENTRIES)).toEqual([{ text: 'nada', replaced: false }])
    expect(dictionaryParts('', ENTRIES)).toEqual([])
  })
})

describe('reapplyDictionary', () => {
  it('corrige los no editados y guarda el texto de whisper para restaurarlo', () => {
    const { segments, changed } = reapplyDictionary(
      [seg('el jompas', { speaker: 'p1' }), seg('sin cambios')],
      ENTRIES
    )
    expect(changed).toBe(1)
    expect(segments[0]).toEqual(seg('el home pass', { speaker: 'p1', originalText: 'el jompas' }))
    expect(segments[1]).toEqual(seg('sin cambios'))
  })

  it('parte del texto de whisper: quitar una palabra y reaplicar deshace su cambio', () => {
    const corrected = seg('el QA', { originalText: 'el cua' })
    const { segments, changed } = reapplyDictionary([corrected], [ENTRIES[0]])
    expect(changed).toBe(1)
    expect(segments[0]).toEqual(seg('el cua'))
  })

  it('en los editados corrige lo que escribió el usuario sin perder el original', () => {
    const edited = seg('mi jompas nuevo', {
      edited: true,
      originalText: 'mi yompas',
      speaker: 'you'
    })
    const { segments, changed } = reapplyDictionary([edited], ENTRIES)
    expect(changed).toBe(1)
    expect(segments[0]).toEqual({ ...edited, text: 'mi home pass nuevo' })
  })

  it('un editado sin coincidencias queda igual', () => {
    const edited = seg('a mano', { edited: true, originalText: 'whisper' })
    const { segments, changed } = reapplyDictionary([edited], ENTRIES)
    expect(changed).toBe(0)
    expect(segments[0]).toBe(edited)
  })
})
