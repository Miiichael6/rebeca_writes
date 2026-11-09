import { describe, expect, it } from 'vitest'
import { editSegment, restorableOriginal } from '../../src/shared/editSegment'
import {
  applyDictionary,
  correctSegment,
  dictionaryPrompt,
  type DictionaryEntry
} from '../../src/shared/dictionary'

function entry(
  spoken: string[],
  written: string,
  extra: Partial<DictionaryEntry> = {}
): DictionaryEntry {
  return { id: written, spoken, written, plural: false, enabled: true, ...extra }
}

const entries: DictionaryEntry[] = [
  entry(['id trabajo'], 'ID_Trabajo', { plural: true }),
  entry(['cua', 'kiu ei', 'q a'], 'QA'),
  entry(['jompas'], 'home pass')
]

describe('applyDictionary', () => {
  it('reemplaza las formas habladas por la escrita', () => {
    expect(applyDictionary('Revisa el id trabajo con cua', entries)).toBe(
      'Revisa el ID_Trabajo con QA'
    )
    expect(applyDictionary('pásale los jompas', entries)).toBe('pásale los home pass')
    expect(applyDictionary('lo vio kiu ei y q a', entries)).toBe('lo vio QA y QA')
  })

  it('acepta el plural y lo conserva', () => {
    expect(applyDictionary('los id trabajos', entries)).toBe('los ID_Trabajos')
    expect(applyDictionary('LOS ID TRABAJOS', entries)).toBe('LOS ID_TrabajoS')
  })

  it('sin `plural` no cambia la forma con s', () => {
    expect(applyDictionary('los cuas', entries)).toBe('los cuas')
  })

  it('ignora mayúsculas y tildes', () => {
    expect(applyDictionary('Cuá y Jompás', entries)).toBe('QA y home pass')
    expect(applyDictionary('Id Trabajo', entries)).toBe('ID_Trabajo')
  })

  it('solo toca palabras completas', () => {
    expect(applyDictionary('el cuadro y la acua', entries)).toBe('el cuadro y la acua')
  })

  it('ignora la puntuación y los espacios de más entre palabras', () => {
    expect(applyDictionary('el id,  trabajo. Listo', entries)).toBe('el ID_Trabajo. Listo')
    expect(applyDictionary('¿cua?', entries)).toBe('¿QA?')
  })

  it('con solapes gana la forma más larga', () => {
    const overlap = [entry(['id'], 'ID'), ...entries]
    expect(applyDictionary('el id trabajo y el id', overlap)).toBe('el ID_Trabajo y el ID')
  })

  it('no aplica las entradas desactivadas', () => {
    const off = entries.map((e) => ({ ...e, enabled: false }))
    expect(applyDictionary('cua', off)).toBe('cua')
  })

  it('aplicarlo dos veces no cambia nada más', () => {
    const once = applyDictionary('los id trabajos con cua', entries)
    expect(applyDictionary(once, entries)).toBe(once)
  })
})

describe('correctSegment', () => {
  it('guarda el texto de whisper sin marcarlo como editado', () => {
    const segment = { start: 0, end: 1, text: 'dile a cua' }
    expect(correctSegment(segment, entries)).toEqual({
      start: 0,
      end: 1,
      text: 'dile a QA',
      originalText: 'dile a cua'
    })
  })

  it('si no cambia nada devuelve el mismo segmento', () => {
    const segment = { start: 0, end: 1, text: 'nada que ver' }
    expect(correctSegment(segment, entries)).toBe(segment)
  })
})

describe('dictionaryPrompt', () => {
  it('pone las formas escritas activas detrás del prompt base', () => {
    expect(dictionaryPrompt(entries, 'Reunión de equipo.')).toBe(
      'Reunión de equipo. ID_Trabajo, QA, home pass'
    )
    expect(dictionaryPrompt(entries, undefined)).toBe('ID_Trabajo, QA, home pass')
  })

  it('sin entradas activas deja el prompt base igual', () => {
    expect(dictionaryPrompt([], 'hola')).toBe('hola')
    expect(dictionaryPrompt([], undefined)).toBeUndefined()
    expect(dictionaryPrompt([{ ...entries[0], enabled: false }], 'hola')).toBe('hola')
  })

  it('no repite formas escritas', () => {
    const repeated = [entry(['cua'], 'QA'), entry(['q a'], 'QA')]
    expect(dictionaryPrompt(repeated, undefined)).toBe('QA')
  })

  it('recorta para no pasar del límite, dando prioridad al diccionario', () => {
    const many = Array.from({ length: 200 }, (_, i) => entry([`w${i}`], `Palabra${i}`))
    const prompt = dictionaryPrompt(many, 'un prompt base muy largo '.repeat(100)) ?? ''
    expect(prompt.length).toBeLessThanOrEqual(550)
    expect(prompt.startsWith('Palabra0, ')).toBe(true)
    const short = dictionaryPrompt(entries, 'uno dos tres '.repeat(100)) ?? ''
    expect(short.length).toBeLessThanOrEqual(550)
    expect(short.endsWith('ID_Trabajo, QA, home pass')).toBe(true)
    expect(short.startsWith('uno') || short.startsWith('dos') || short.startsWith('tres')).toBe(
      true
    )
  })
})

describe('restorableOriginal', () => {
  it('ofrece volver al texto de whisper tras el diccionario o una edición', () => {
    const fixed = correctSegment({ start: 0, end: 1, text: 'a cua' }, entries)
    expect(restorableOriginal(fixed)).toBe('a cua')
    expect(restorableOriginal(editSegment(fixed, 'a QA, ya'))).toBe('a cua')
  })

  it('restaurado ya no ofrece nada', () => {
    const fixed = correctSegment({ start: 0, end: 1, text: 'a cua' }, entries)
    expect(restorableOriginal(editSegment(fixed, 'a cua'))).toBeUndefined()
    expect(restorableOriginal({ start: 0, end: 1, text: 'x' })).toBeUndefined()
  })
})
