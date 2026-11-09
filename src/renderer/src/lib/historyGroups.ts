import type { HistoryEntry } from '@shared/types'

export type HistoryGroupKey = 'today' | 'yesterday' | 'week' | 'month' | 'older'

export interface HistoryGroup {
  /** Grupo por fecha: `today`…`older`; por carpeta: `dir:` + la ruta. */
  key: string
  /** Ruta de la carpeta (vacía = entradas sin archivo); solo en los grupos por carpeta. */
  folder?: string
  /** Nombre del programa (vacío = no viene de un programa); solo en los grupos por programa. */
  app?: string
  entries: HistoryEntry[]
}

export type HistoryGroupMode = 'date' | 'folder' | 'app'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Carpeta que contiene el archivo (sin barra final); vacía si la entrada no tiene ruta. */
export function folderOf(filePath: string): string {
  const cut = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'))
  return cut < 0 ? '' : filePath.slice(0, cut)
}

/** Nombre corto de una carpeta: su último tramo (o la unidad, como `C:`). */
export function folderName(folder: string): string {
  const cut = Math.max(folder.lastIndexOf('\\'), folder.lastIndexOf('/'))
  return cut < 0 ? folder : folder.slice(cut + 1) || folder
}

/**
 * Agrupa el historial por el programa que se grabó (orden alfabético); lo que no viene de un
 * programa (archivos importados, micrófono, todo el sonido) va al final, en un grupo sin `app`.
 */
export function groupHistoryByApp(entries: readonly HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>()
  for (const entry of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    const app = entry.app ?? ''
    const key = `app:${app.toLowerCase()}`
    const group = groups.get(key) ?? { key, app, entries: [] }
    group.entries.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.app || !b.app) return a.app ? -1 : b.app ? 1 : 0
    return a.app.localeCompare(b.app, undefined, { sensitivity: 'base' })
  })
}

/**
 * Agrupa el historial por carpeta del archivo (Windows no distingue mayúsculas). Los grupos van
 * del que tiene la entrada más reciente al más antiguo, y dentro de cada uno, lo más nuevo primero.
 */
export function groupHistoryByFolder(entries: readonly HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>()
  for (const entry of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    const folder = folderOf(entry.filePath)
    const key = `dir:${folder.toLowerCase()}`
    const group = groups.get(key) ?? { key, folder, entries: [] }
    group.entries.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()]
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
  const groups = new Map<string, HistoryEntry[]>(order.map((k) => [k, []]))
  for (const entry of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    groups.get(keyOf(entry.createdAt))!.push(entry)
  }
  return order
    .map((key) => ({ key, entries: groups.get(key)! }))
    .filter((g) => g.entries.length > 0)
}
