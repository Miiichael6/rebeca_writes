import { create } from 'zustand'
import { MEDIA_FILTER_KEYS, type MediaFilterKey } from '@shared/formats'
import type { HistoryEntry, OpenedMedia } from '@shared/types'
import i18n from '@renderer/i18n'
import { mockHistory } from './mocks'
import { useSettingsStore } from './settings'
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
  /**
   * "Abrir archivo": elige un archivo, crea su entrada en el historial y la abre. La
   * selección múltiple y el envío a la cola son de la tarea 19.
   */
  openFile: () => Promise<void>
  /** Cambia campos de una entrada (estado, progreso, idioma detectado...). */
  patchEntry: (id: string, patch: Partial<Omit<HistoryEntry, 'id'>>) => void
  /** "Buscar archivo...": elige el archivo en disco y lo asocia a la entrada (en memoria; se persiste en la 18). */
  locateFile: (id: string) => Promise<void>
  /**
   * Vacía el historial y la caché de vistas previas (spec §5). Las entradas solo se borran
   * en memoria; el borrado en disco es de la tarea 18.
   */
  clear: () => void
}

function filterLabels(): Record<MediaFilterKey, string> {
  return Object.fromEntries(
    MEDIA_FILTER_KEYS.map((key) => [key, i18n.t(`fileFilters.${key}`)])
  ) as Record<MediaFilterKey, string>
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
  openFile: async () => {
    const media = await window.api.media.pickFile(filterLabels())
    if (!media) return
    const { model, language } = useSettingsStore.getState().settings
    const entry = await window.api.history.create({
      filePath: media.filePath,
      fileName: media.fileName,
      durationSec: media.info?.durationSec ?? 0,
      model,
      language
    })
    set((s) => ({ entries: [entry, ...s.entries], media: { ...s.media, [entry.id]: media } }))
    get().select(entry.id)
  },
  patchEntry: (id, patch) => {
    const entries = get().entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
    set({ entries })
    const updated = entries.find((e) => e.id === id)
    if (updated && useTranscriptStore.getState().entry?.id === id) {
      useTranscriptStore.setState({ entry: updated })
    }
  },
  locateFile: async (id) => {
    const media = await window.api.media.pickFile(filterLabels())
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
