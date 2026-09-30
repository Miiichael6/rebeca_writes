import { describe, expect, it } from 'vitest'
import { committedText } from '@renderer/components/TranscriptView/domain/editing'
import { splitHighlight } from '@renderer/components/TranscriptView/domain/highlight'
import {
  isCopyShortcut,
  isFindShortcut,
  isScrollKey
} from '@renderer/components/TranscriptView/domain/keyboard'
import { currentInRange, indexInRange } from '@renderer/components/TranscriptView/domain/rows'
import { scrollDelta } from '@renderer/components/TranscriptView/domain/scrollGeometry'
import {
  clampCursor,
  firstCursor,
  stepCursor
} from '@renderer/components/TranscriptView/domain/searchCursor'
import type { SearchMatch } from '@renderer/lib/search'

type Mods = Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>>

const key = (
  k: string,
  mods: Mods = {}
): { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean } => ({
  key: k,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods
})

describe('splitHighlight', () => {
  const m = (segmentIndex: number, start: number, end: number): SearchMatch =>
    ({ segmentIndex, start, end }) as SearchMatch

  it('devuelve el texto entero sin coincidencias', () => {
    expect(splitHighlight('hola mundo', [], 0, 0)).toEqual([{ text: 'hola mundo', match: null }])
  })

  it('separa texto suelto y coincidencias con su índice global', () => {
    const matches = [m(0, 0, 1), m(1, 3, 5), m(1, 6, 8)]
    expect(splitHighlight('ab cd ef!', matches, 1, 2)).toEqual([
      { text: 'ab ', match: null },
      { text: 'cd', match: 1 },
      { text: ' ', match: null },
      { text: 'ef', match: 2 },
      { text: '!', match: null }
    ])
  })
})

describe('rows', () => {
  it('currentInRange solo devuelve la actual si cae en el tramo', () => {
    expect(currentInRange(3, 2, 5)).toBe(3)
    expect(currentInRange(5, 2, 5)).toBe(-1)
    expect(currentInRange(-1, 0, 5)).toBe(-1)
  })

  it('indexInRange admite null', () => {
    expect(indexInRange(null, 0, 5)).toBe(-1)
    expect(indexInRange(4, 0, 5)).toBe(4)
    expect(indexInRange(5, 0, 5)).toBe(-1)
  })
})

describe('scrollDelta', () => {
  const container = { top: 100, bottom: 500 }

  it('no desplaza si el elemento ya se ve entero', () => {
    expect(scrollDelta({ top: 150, bottom: 200 }, container, 'center')).toBe(0)
  })

  it('centra el elemento', () => {
    expect(scrollDelta({ top: 600, bottom: 640 }, container, 'center')).toBe(320)
  })

  it('start alinea arriba y end alinea abajo', () => {
    expect(scrollDelta({ top: 600, bottom: 640 }, container, 'start')).toBe(500)
    expect(scrollDelta({ top: 600, bottom: 640 }, container, 'end')).toBe(140)
  })

  it('auto sube si está por encima y baja si está por debajo', () => {
    expect(scrollDelta({ top: 50, bottom: 90 }, container, 'auto')).toBe(-50)
    expect(scrollDelta({ top: 600, bottom: 640 }, container, 'auto')).toBe(140)
  })
})

describe('keyboard', () => {
  it('Ctrl+F y Ctrl+C sin otros modificadores', () => {
    expect(isFindShortcut(key('f', { ctrlKey: true }))).toBe(true)
    expect(isFindShortcut(key('F', { ctrlKey: true }))).toBe(true)
    expect(isFindShortcut(key('f', { ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(isFindShortcut(key('f'))).toBe(false)
    expect(isCopyShortcut(key('c', { ctrlKey: true }))).toBe(true)
    expect(isCopyShortcut(key('c', { ctrlKey: true, altKey: true }))).toBe(false)
  })

  it('las teclas de desplazamiento no cuentan con Ctrl o Alt', () => {
    expect(isScrollKey(key('PageDown'))).toBe(true)
    expect(isScrollKey(key('PageDown', { ctrlKey: true }))).toBe(false)
    expect(isScrollKey(key('a'))).toBe(false)
  })
})

describe('searchCursor', () => {
  it('firstCursor', () => {
    expect(firstCursor(0)).toBe(-1)
    expect(firstCursor(4)).toBe(0)
  })

  it('clampCursor conserva la actual sin salirse', () => {
    expect(clampCursor(2, 0)).toBe(-1)
    expect(clampCursor(7, 3)).toBe(2)
    expect(clampCursor(-1, 3)).toBe(0)
    expect(clampCursor(1, 3)).toBe(1)
  })

  it('stepCursor da la vuelta por los dos extremos', () => {
    expect(stepCursor(-1, 1, 3)).toBe(0)
    expect(stepCursor(2, 1, 3)).toBe(0)
    expect(stepCursor(0, -1, 3)).toBe(2)
  })
})

describe('committedText', () => {
  it('recorta y trata lo vacío como cancelar', () => {
    expect(committedText('  hola  ')).toBe('hola')
    expect(committedText('   ')).toBeNull()
  })
})
