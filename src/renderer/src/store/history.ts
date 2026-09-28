import { create } from 'zustand'
import { MEDIA_FILTER_KEYS, type MediaFilterKey } from '@shared/formats'
import type { HistoryEntry, OpenedMedia } from '@shared/types'
import i18n from '@renderer/i18n'
import { mockHistory } from './mocks'
import { useTranscriptStore } from './transcript'

interface HistoryState {
  entries: HistoryEntry[]
  selectedId: string | null
  /** Texto del campo "Filtrar por...". */
  filter: string
  /**
   * Archivo listo para el reproductor, por id de entrada. Sin entrada aquí, el archivo
   * "no está disponible". Hoy solo la llena "Buscar archivo..."; con el historial real
   * (tarea 18) el main registra cada archivo al cargar la entrada y comprueba si existe.
   */
  media: Record<string, OpenedMedia>
  select: (id: string) => void
  setFilter: (filter: string) => void
  /** "Buscar archivo...": elige el archivo en disco y lo asocia a la entrada (en memoria; se persiste en la 18). */
  locateFile: (id: string) => Promise<void>
  /**
   * Vacía el historial y la caché de vistas previas (spec §5). Las entradas solo se borran
   * en memoria; el borrado en disco es de la tarea 18.
   */
  clear: () => void
}

const initialId = mockHistory[0]?.id ?? null

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: mockHistory,
  selectedId: initialId,
  filter: '',
  media: {},
  select: (id) => {
    set({ selectedId: id })
    useTranscriptStore.getState().open(get().entries.find((e) => e.id === id) ?? null)
  },
  setFilter: (filter) => set({ filter }),
  locateFile: async (id) => {
    const labels = Object.fromEntries(
      MEDIA_FILTER_KEYS.map((key) => [key, i18n.t(`fileFilters.${key}`)])
    ) as Record<MediaFilterKey, string>
    const media = await window.api.media.pickFile(labels)
    if (!media) return
    const entries = get().entries.map((e) =>
      e.id === id
        ? { ...e, filePath: media.filePath, durationSec: media.info?.durationSec || e.durationSec }
        : e
    )
    set({ entries, media: { ...get().media, [id]: media } })
    // La transcripción abierta sigue igual; solo cambia la entrada a la que apunta.
    const updated = entries.find((e) => e.id === id)
    if (updated && useTranscriptStore.getState().entry?.id === id) {
      useTranscriptStore.setState({ entry: updated })
    }
  },
  clear: () => {
    set({ entries: [], selectedId: null, media: {} })
    useTranscriptStore.getState().open(null)
    window.api.media.clearPreviewCache().catch(() => {})
  }
}))

useTranscriptStore.getState().open(mockHistory.find((e) => e.id === initialId) ?? null)

/** Entradas que pasan el filtro. Por ahora solo por nombre; el texto de la transcripción entra en la tarea 18. */
export function filterHistory(entries: HistoryEntry[], filter: string): HistoryEntry[] {
  const q = filter.trim().toLocaleLowerCase()
  return q ? entries.filter((e) => e.fileName.toLocaleLowerCase().includes(q)) : entries
}
