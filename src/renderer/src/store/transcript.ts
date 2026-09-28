import { create } from 'zustand'
import type { HistoryEntry, Segment, TranscriptStatus } from '@shared/types'
import { mockSegments } from './mocks'

interface TranscriptState {
  /** Entrada del historial abierta, o `null` si no hay archivo. */
  entry: HistoryEntry | null
  segments: Segment[]
  status: TranscriptStatus
  /** 0–100 mientras se transcribe. */
  progress: number
  /** Segundos restantes estimados mientras se transcribe. */
  etaSec: number | null
  open: (entry: HistoryEntry | null) => void
  start: () => void
  cancel: () => void
}

/** Estado de ejemplo según el estado de la entrada. La transcripción real llega en la tarea 13. */
function mockStateFor(
  entry: HistoryEntry | null
): Omit<TranscriptState, 'open' | 'start' | 'cancel'> {
  const base = { entry, segments: [], progress: 0, etaSec: null }
  if (!entry) return { ...base, status: 'idle' }
  switch (entry.status) {
    case 'done':
      return { ...base, status: 'done', segments: mockSegments }
    case 'transcribing': {
      const progress = entry.progress ?? 0
      const count = Math.round((mockSegments.length * progress) / 100)
      return {
        ...base,
        status: 'transcribing',
        segments: mockSegments.slice(0, count),
        progress,
        etaSec: 95
      }
    }
    default:
      return { ...base, status: 'ready' }
  }
}

export const useTranscriptStore = create<TranscriptState>()((set) => ({
  ...mockStateFor(null),
  open: (entry) => set(mockStateFor(entry)),
  // Solo cambian el estado visible; el motor real se conecta en las tareas 08 y 13.
  start: () => set({ status: 'transcribing', progress: 0, etaSec: null, segments: [] }),
  cancel: () => set({ status: 'ready', progress: 0, etaSec: null })
}))
