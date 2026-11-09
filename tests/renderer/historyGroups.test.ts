import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '@shared/types'
import { groupHistory, groupHistoryByApp, groupHistoryByFolder } from '@renderer/lib/historyGroups'

function entry(id: string, createdAt: Date): HistoryEntry {
  return {
    id,
    filePath: `C:\\${id}.mp4`,
    fileName: `${id}.mp4`,
    durationSec: 60,
    model: 'small',
    language: 'es',
    createdAt: createdAt.getTime(),
    status: 'done'
  }
}

describe('groupHistory', () => {
  // Jueves 17 de septiembre de 2026, 15:00 hora local. La semana empieza el lunes 14.
  const now = new Date(2026, 8, 17, 15, 0).getTime()

  it('reparte las entradas en Hoy, Ayer, Esta semana, Este mes y Anteriores', () => {
    const groups = groupHistory(
      [
        entry('older', new Date(2026, 7, 31, 23, 59)),
        entry('today', new Date(2026, 8, 17, 0, 0)),
        entry('month', new Date(2026, 8, 13, 22, 0)),
        entry('week', new Date(2026, 8, 14, 0, 0)),
        entry('yesterday', new Date(2026, 8, 16, 23, 59))
      ],
      now
    )
    expect(groups.map((g) => [g.key, g.entries.map((e) => e.id)])).toEqual([
      ['today', ['today']],
      ['yesterday', ['yesterday']],
      ['week', ['week']],
      ['month', ['month']],
      ['older', ['older']]
    ])
  })

  it('ordena del más reciente al más antiguo y omite grupos vacíos', () => {
    const groups = groupHistory(
      [entry('a', new Date(2026, 8, 17, 9, 0)), entry('b', new Date(2026, 8, 17, 14, 0))],
      now
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].entries.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('un lunes, el domingo anterior es Ayer y no Esta semana', () => {
    const monday = new Date(2026, 8, 14, 10, 0).getTime()
    const groups = groupHistory([entry('sun', new Date(2026, 8, 13, 20, 0))], monday)
    expect(groups[0].key).toBe('yesterday')
  })
})

describe('groupHistoryByFolder', () => {
  it('agrupa por la carpeta del archivo sin distinguir mayúsculas, lo más reciente primero', () => {
    const at = (id: string, path: string, day: number): HistoryEntry => ({
      ...entry(id, new Date(2026, 8, day)),
      filePath: path
    })
    const groups = groupHistoryByFolder([
      at('a', 'D:\\Clases\\a.mp4', 1),
      at('b', 'C:\\Otros\\b.mp4', 5),
      at('c', 'd:\\clases\\c.mp4', 3)
    ])
    expect(groups.map((g) => g.entries.map((e) => e.id))).toEqual([['b'], ['c', 'a']])
    expect(groups[0].folder).toBe('C:\\Otros')
  })
})

describe('groupHistoryByApp', () => {
  it('agrupa por programa en orden alfabético y deja lo demás al final', () => {
    const withApp = (id: string, app?: string): HistoryEntry => ({
      ...entry(id, new Date(2026, 8, 10)),
      ...(app ? { app } : {})
    })
    const groups = groupHistoryByApp([
      withApp('x'),
      withApp('s', 'Spotify'),
      withApp('w1', 'Webex'),
      withApp('w2', 'webex')
    ])
    expect(groups.map((g) => g.app)).toEqual(['Spotify', 'Webex', ''])
    expect(groups[1].entries).toHaveLength(2)
  })
})
