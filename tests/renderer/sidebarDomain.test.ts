import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '@shared/types'
import { shownName } from '@renderer/components/Sidebar/domain/entry'
import {
  isRenameShortcut,
  menuAnchor,
  movedTooFar,
  resizeKeyDelta
} from '@renderer/components/Sidebar/domain/interaction'
import { toggleChecked, visibleChecked } from '@renderer/components/Sidebar/domain/selection'

describe('shownName', () => {
  it('usa el nombre puesto por el usuario o, si no, el del archivo', () => {
    const base = { fileName: 'a.mp4' } as HistoryEntry
    expect(shownName(base)).toBe('a.mp4')
    expect(shownName({ ...base, displayName: 'Reunión' })).toBe('Reunión')
  })
})

describe('selección múltiple', () => {
  it('toggleChecked marca, desmarca y no hace nada fuera del modo', () => {
    expect(toggleChecked(null, 'a')).toBeNull()
    const on = toggleChecked(new Set(['a']), 'b')
    expect([...(on ?? [])]).toEqual(['a', 'b'])
    expect([...(toggleChecked(on, 'a') ?? [])]).toEqual(['b'])
  })

  it('toggleChecked no muta el conjunto anterior', () => {
    const prev = new Set(['a'])
    toggleChecked(prev, 'b')
    expect([...prev]).toEqual(['a'])
  })

  it('visibleChecked descarta lo que ya no se ve', () => {
    expect(visibleChecked(new Set(['a', 'b', 'c']), new Set(['a', 'c']))).toEqual(['a', 'c'])
    expect(visibleChecked(null, new Set(['a']))).toEqual([])
  })
})

describe('interacción', () => {
  it('movedTooFar tolera pequeños temblores', () => {
    expect(movedTooFar({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false)
    expect(movedTooFar({ x: 0, y: 0 }, { x: 6, y: 1 })).toBe(true)
  })

  it('resizeKeyDelta solo responde a las flechas horizontales', () => {
    expect(resizeKeyDelta('ArrowRight')).toBe(16)
    expect(resizeKeyDelta('ArrowLeft')).toBe(-16)
    expect(resizeKeyDelta('ArrowUp')).toBe(0)
  })

  it('menuAnchor usa el puntero, o el ítem si el evento viene del teclado', () => {
    const item = { left: 10, bottom: 90 }
    expect(menuAnchor({ clientX: 50, clientY: 60 }, item)).toEqual({ x: 50, y: 60 })
    expect(menuAnchor({ clientX: 0, clientY: 0 }, item)).toEqual({ x: 30, y: 90 })
  })

  it('isRenameShortcut: F2 sin modificadores ni repetición', () => {
    const keys = {
      key: 'F2',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      repeat: false
    }
    expect(isRenameShortcut(keys)).toBe(true)
    expect(isRenameShortcut({ ...keys, ctrlKey: true })).toBe(false)
    expect(isRenameShortcut({ ...keys, repeat: true })).toBe(false)
    expect(isRenameShortcut({ ...keys, key: 'F3' })).toBe(false)
  })
})
