import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '@shared/types'
import { filterHistory } from '@renderer/lib/historyFilter'

function entry(id: string, fileName: string, displayName?: string): HistoryEntry {
  return {
    id,
    filePath: `C:\\v\\${fileName}`,
    fileName,
    ...(displayName ? { displayName } : {}),
    durationSec: 60,
    model: 'small',
    language: 'es',
    createdAt: 0,
    status: 'done'
  }
}

const entries = [
  entry('a', 'Reunión de equipo.mkv'),
  entry('b', 'podcast-12.mp3', 'Entrevista con Ñandú'),
  entry('c', 'clase.mp4')
]

describe('filterHistory', () => {
  it('sin filtro devuelve todo', () => {
    expect(filterHistory(entries, '  ')).toBe(entries)
  })

  it('filtra por nombre sin mayúsculas ni tildes', () => {
    expect(filterHistory(entries, 'REUNION').map((e) => e.id)).toEqual(['a'])
  })

  it('usa el nombre mostrado si la entrada se renombró', () => {
    expect(filterHistory(entries, 'nandu').map((e) => e.id)).toEqual(['b'])
    expect(filterHistory(entries, 'podcast')).toEqual([])
  })

  it('incluye las que coinciden por el texto de la transcripción', () => {
    expect(filterHistory(entries, 'algo dicho', new Set(['c'])).map((e) => e.id)).toEqual(['c'])
    expect(filterHistory(entries, 'clase', new Set(['a'])).map((e) => e.id)).toEqual(['a', 'c'])
  })
})
