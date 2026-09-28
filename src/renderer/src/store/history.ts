import { create } from 'zustand'
import type { HistoryEntry } from '@shared/types'
import { mockHistory } from './mocks'
import { useTranscriptStore } from './transcript'

interface HistoryState {
  entries: HistoryEntry[]
  selectedId: string | null
  /** Texto del campo "Filtrar por...". */
  filter: string
  select: (id: string) => void
  setFilter: (filter: string) => void
  /** Vacía el historial. Por ahora solo en memoria; el borrado real es de la tarea 18. */
  clear: () => void
}

const initialId = mockHistory[0]?.id ?? null

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: mockHistory,
  selectedId: initialId,
  filter: '',
  select: (id) => {
    set({ selectedId: id })
    useTranscriptStore.getState().open(get().entries.find((e) => e.id === id) ?? null)
  },
  setFilter: (filter) => set({ filter }),
  clear: () => {
    set({ entries: [], selectedId: null })
    useTranscriptStore.getState().open(null)
  }
}))

useTranscriptStore.getState().open(mockHistory.find((e) => e.id === initialId) ?? null)

/** Entradas que pasan el filtro. Por ahora solo por nombre; el texto de la transcripción entra en la tarea 18. */
export function filterHistory(entries: HistoryEntry[], filter: string): HistoryEntry[] {
  const q = filter.trim().toLocaleLowerCase()
  return q ? entries.filter((e) => e.fileName.toLocaleLowerCase().includes(q)) : entries
}
