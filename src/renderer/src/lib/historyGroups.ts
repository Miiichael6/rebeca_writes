import type { HistoryEntry } from '@shared/types'

export type HistoryGroupKey = 'today' | 'yesterday' | 'week' | 'month' | 'older'

export interface HistoryGroup {
  key: HistoryGroupKey
  entries: HistoryEntry[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Agrupa el historial por fecha (Hoy, Ayer, Esta semana, Este mes, Anteriores), del más reciente
 * al más antiguo. Las semanas empiezan el lunes. Solo devuelve los grupos con entradas.
 */
export function groupHistory(entries: readonly HistoryEntry[], now = Date.now()): HistoryGroup[] {
  const today = startOfDay(now)
  const yesterday = today - DAY_MS
  const weekday = (new Date(today).getDay() + 6) % 7 // lunes = 0
  const week = today - weekday * DAY_MS
  const monthDate = new Date(today)
  monthDate.setDate(1)
  const month = monthDate.getTime()

  const keyOf = (createdAt: number): HistoryGroupKey => {
    if (createdAt >= today) return 'today'
    if (createdAt >= yesterday) return 'yesterday'
    if (createdAt >= week) return 'week'
    if (createdAt >= month) return 'month'
    return 'older'
  }

  const order: HistoryGroupKey[] = ['today', 'yesterday', 'week', 'month', 'older']
  const groups = new Map<HistoryGroupKey, HistoryEntry[]>(order.map((k) => [k, []]))
  for (const entry of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    groups.get(keyOf(entry.createdAt))!.push(entry)
  }
  return order
    .map((key) => ({ key, entries: groups.get(key)! }))
    .filter((g) => g.entries.length > 0)
}
