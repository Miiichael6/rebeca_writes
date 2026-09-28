import { useEffect } from 'react'
import { create } from 'zustand'
import { MEDIA_FILTER_KEYS, type MediaFilterKey } from '@shared/formats'
import type { HistoryEntry, OpenedMedia } from '@shared/types'
import i18n from '@renderer/i18n'
import { announceQueued } from './queue'
import { useSettingsStore } from './settings'
import { forgetResults, setLoadedResult, useTranscriptStore } from './transcript'

/** Espera tras la última tecla antes de buscar en el texto de las transcripciones. */
const SEARCH_DEBOUNCE_MS = 200

interface HistoryState {
  entries: HistoryEntry[]
  selectedId: string | null
  /** Texto del campo "Filtrar por...". */
  filter: string
  /**
   * Ids de las entradas cuya transcripción contiene el filtro (`history:search`), o `null`
   * mientras no hay filtro. Se rellena con debounce, así que va un poco por detrás del texto.
   */
  textMatches: Set<string> | null
  /**
   * Archivo listo para el reproductor, por id de entrada. Lo llena `history:get` al abrir la
   * entrada: `null` si el archivo original "no está disponible"; sin id, aún no se sabe.
   */
  media: Record<string, OpenedMedia | null>
  select: (id: string) => void
  setFilter: (filter: string) => void
  /** Carga la lista de `history:list` (al arrancar). */
  load: () => Promise<void>
  /**
   * "Abrir archivo" (`Ctrl+O`): con un solo archivo crea su entrada en el historial y la
   * abre; si se eligen varios, van todos a la cola.
   */
  openFile: () => Promise<void>
  /**
   * Entrada que creó (o retomó) el main, p. ej. la cola al empezar un trabajo: se reemplaza
   * si ya está y si no se añade arriba. Lo que el renderer ya sabe en vivo (estado y
   * progreso del trabajo en curso) se conserva.
   */
  upsertEntry: (entry: HistoryEntry) => void
  /** Abre la vista del trabajo de la cola `jobId` (su entrada del historial y su archivo). */
  openQueueJob: (jobId: string) => Promise<boolean>
  /** Cambia campos de una entrada (estado, progreso, idioma detectado...). */
  patchEntry: (id: string, patch: Partial<Omit<HistoryEntry, 'id'>>) => void
  /** "Buscar archivo...": el main abre el diálogo y apunta la entrada al archivo elegido. */
  locateFile: (id: string) => Promise<void>
  /** Cambia solo el nombre mostrado; vacío vuelve al nombre del archivo. */
  rename: (id: string, displayName: string) => Promise<void>
  /** Quita una entrada del historial (el archivo original no se toca). */
  remove: (id: string) => Promise<void>
  /** Si la transcripción de la entrada tiene ediciones a mano (se perderían al rehacerla). */
  hasEdits: (id: string) => Promise<boolean>
  /** Vuelve a encolar el archivo de la entrada con los ajustes actuales; `false` si ya estaba. */
  retranscribe: (id: string) => Promise<boolean>
  /** Abre el Explorador con el archivo original seleccionado. */
  showInFolder: (id: string) => Promise<void>
  /**
   * Vacía el historial, sus transcripciones y la caché de vistas previas (spec §5). Los
   * medios originales y los .srt exportados no se tocan.
   */
  clear: () => Promise<void>
}

/** Nombres traducidos de los filtros del diálogo Abrir. */
export function filterLabels(): Record<MediaFilterKey, string> {
  return Object.fromEntries(
    MEDIA_FILTER_KEYS.map((key) => [key, i18n.t(`fileFilters.${key}`)])
  ) as Record<MediaFilterKey, string>
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
/** Número de la última búsqueda lanzada: una respuesta vieja no pisa a una más reciente. */
let searchSeq = 0

/** Busca `filter` en el texto de las transcripciones, `SEARCH_DEBOUNCE_MS` tras la última tecla. */
function scheduleSearch(filter: string, apply: (matches: Set<string> | null) => void): void {
  clearTimeout(searchTimer)
  const seq = ++searchSeq
  if (!filter.trim()) {
    apply(null)
    return
  }
  searchTimer = setTimeout(() => {
    window.api.history
      .search(filter)
      .then((ids) => {
        if (seq === searchSeq) apply(new Set(ids))
      })
      .catch(() => {
        if (seq === searchSeq) apply(null)
      })
  }, SEARCH_DEBOUNCE_MS)
}

/** Estados con una transcripción que no va a cambiar sola: su resultado se puede recordar. */
const TERMINAL: ReadonlySet<HistoryEntry['status']> = new Set(['done', 'error', 'cancelled'])

export const useHistoryStore = create<HistoryState>()((set, get) => {
  /**
   * Abre la entrada en el panel de transcripción y pide al main sus segmentos y si el
   * archivo sigue en su sitio. Mientras llega la respuesta se ve lo que ya hay en memoria.
   */
  async function loadEntry(id: string): Promise<void> {
    const transcript = useTranscriptStore.getState()
    transcript.open(get().entries.find((e) => e.id === id) ?? null)
    const opened = await window.api.history.get(id).catch(() => null)
    // El usuario pudo cambiar de entrada o borrar esta mientras tanto.
    if (get().selectedId !== id || !get().entries.some((e) => e.id === id)) return
    set((s) => ({ media: { ...s.media, [id]: opened?.media ?? null } }))
    if (!opened) return
    const current = get().entries.find((e) => e.id === id)!
    // Lo que se está transcribiendo ahora manda sobre lo que hay en disco.
    const live = useTranscriptStore.getState().job?.entryId === id
    if (!live && TERMINAL.has(current.status)) {
      setLoadedResult(id, opened.segments, null)
    }
    useTranscriptStore.getState().open(current)
  }

  return {
    entries: [],
    selectedId: null,
    filter: '',
    textMatches: null,
    media: {},
    select: (id) => {
      set({ selectedId: id })
      void loadEntry(id)
    },
    setFilter: (filter) => {
      set({ filter })
      scheduleSearch(filter, (textMatches) => set({ textMatches }))
    },
    load: async () => {
      const entries = await window.api.history.list()
      // Se conserva lo que el renderer ya sabe en vivo si llegó algo antes que la lista.
      const known = new Map(get().entries.map((e) => [e.id, e]))
      set({
        entries: entries.map((e) => (e.status === 'transcribing' ? (known.get(e.id) ?? e) : e))
      })
    },
    openFile: async () => {
      const opened = await window.api.media.openFiles(filterLabels())
      if (!opened) return
      if (opened.kind === 'queued') {
        announceQueued(opened.result)
        return
      }
      const { media } = opened
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
    upsertEntry: (entry) => {
      const current = get().entries.find((e) => e.id === entry.id)
      if (!current) {
        set((s) => ({ entries: [entry, ...s.entries] }))
        return
      }
      const live = current.status === 'transcribing'
      get().patchEntry(entry.id, {
        ...entry,
        ...(live ? { status: current.status, progress: current.progress } : {})
      })
    },
    openQueueJob: async (jobId) => {
      const opened = await window.api.queue.openJob(jobId)
      if (!opened) return false
      get().upsertEntry(opened.entry)
      get().select(opened.entry.id)
      return true
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
      const relocated = await window.api.history.relocate(id, filterLabels())
      if (!relocated) return
      set((s) => ({ media: { ...s.media, [id]: relocated.media } }))
      // La transcripción abierta sigue igual; solo cambia la entrada a la que apunta.
      get().patchEntry(id, relocated.entry)
    },
    rename: async (id, displayName) => {
      const entry = await window.api.history.rename(id, displayName)
      if (!entry) return
      // Se pasa siempre la clave: con `undefined` el nombre vuelve al del archivo.
      get().patchEntry(id, { displayName: entry.displayName })
    },
    remove: async (id) => {
      if (!(await window.api.history.remove(id))) return
      forgetResults(id)
      const { selectedId } = get()
      const media = { ...get().media }
      delete media[id]
      set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
        media,
        selectedId: selectedId === id ? null : selectedId
      }))
      if (selectedId === id) useTranscriptStore.getState().open(null)
      // Los resultados de búsqueda de texto pueden incluir la entrada borrada.
      scheduleSearch(get().filter, (textMatches) => set({ textMatches }))
    },
    hasEdits: async (id) => {
      const transcript = useTranscriptStore.getState()
      if (transcript.entry?.id === id) return transcript.segments.some((s) => s.edited)
      const opened = await window.api.history.get(id).catch(() => null)
      return opened?.segments.some((s) => s.edited) ?? false
    },
    retranscribe: (id) => window.api.history.retranscribe(id),
    showInFolder: (id) => window.api.history.showInFolder(id),
    clear: async () => {
      await window.api.history.clear()
      forgetResults()
      set({ entries: [], selectedId: null, media: {}, textMatches: null })
      useTranscriptStore.getState().open(null)
      // El main ya vació la caché de vistas previas; el renderer se entera por `media:preview`.
    }
  }
})

/** Carga el historial guardado al arrancar. Se llama una vez, en App. */
export function useHistorySync(): void {
  useEffect(() => {
    useHistoryStore
      .getState()
      .load()
      .catch(() => {})
  }, [])
}
