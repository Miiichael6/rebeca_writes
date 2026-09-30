import { useEffect } from 'react'
import { create } from 'zustand'
import type { ResolvedTheme } from '@shared/theme'

export type View = 'main' | 'settings'

const SIDEBAR_KEY = 'sidebarCollapsed'
const SIDEBAR_WIDTH_KEY = 'sidebarWidth'

/** Ancho del menú lateral: por defecto y límites. */
export const SIDEBAR_WIDTH_DEFAULT = 264
export const SIDEBAR_WIDTH_MIN = 200
export const SIDEBAR_WIDTH_MAX = 420

export const clampSidebarWidth = (width: number): number =>
  Math.round(Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width)))

function loadSidebarWidth(): number {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    return stored > 0 ? clampSidebarWidth(stored) : SIDEBAR_WIDTH_DEFAULT
  } catch {
    return SIDEBAR_WIDTH_DEFAULT
  }
}

/** El menú lateral compacto se recuerda por conveniencia; sin `localStorage` arranca expandido. */
function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Estado de la interfaz que no se guarda. Lo que sobrevive a un reinicio (tema, idioma,
 * modelo, altura del video...) está en `useSettingsStore`.
 */
interface UiState {
  /** Tema aplicado de verdad; lo decide el main con `nativeTheme` a partir de `settings.theme`. */
  resolvedTheme: ResolvedTheme
  setResolvedTheme: (theme: ResolvedTheme) => void

  view: View
  setView: (view: View) => void
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  videoVisible: boolean
  toggleVideo: () => void
  /** Menú lateral reducido a una franja de iconos. */
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  sidebarWidth: number
  /** `persist: false` mientras se arrastra; se guarda al soltar. */
  setSidebarWidth: (width: number, persist?: boolean) => void
  /** El video ocupa todo el espacio y tapa la transcripción (lo calcula `Player`). */
  transcriptCovered: boolean
  setTranscriptCovered: (covered: boolean) => void
  /** Ventanita flotante con la transcripción, mientras el video la tapa. */
  transcriptWindowOpen: boolean
  toggleTranscriptWindow: () => void
  setTranscriptWindowOpen: (open: boolean) => void
}

/** Tema inicial antes de hablar con el main. Chromium ya refleja `nativeTheme` en esta media query. */
function initialTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUiStore = create<UiState>()((set) => ({
  resolvedTheme: initialTheme(),
  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),

  view: 'main',
  setView: (view) => set({ view }),
  queueOpen: false,
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  videoVisible: true,
  sidebarCollapsed: loadSidebarCollapsed(),
  sidebarWidth: loadSidebarWidth(),
  setSidebarWidth: (width, persist = true) => {
    const sidebarWidth = clampSidebarWidth(width)
    if (persist) {
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
      } catch {
        // Sin almacenamiento: solo dura la sesión.
      }
    }
    set({ sidebarWidth })
  },
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed
      try {
        localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0')
      } catch {
        // Sin almacenamiento: solo dura la sesión.
      }
      return { sidebarCollapsed }
    }),
  toggleVideo: () => set((s) => ({ videoVisible: !s.videoVisible })),
  transcriptCovered: false,
  setTranscriptCovered: (transcriptCovered) => set({ transcriptCovered }),
  transcriptWindowOpen: false,
  toggleTranscriptWindow: () => set((s) => ({ transcriptWindowOpen: !s.transcriptWindowOpen })),
  setTranscriptWindowOpen: (transcriptWindowOpen) => set({ transcriptWindowOpen })
}))

/**
 * Mantiene `data-theme` de <html> al día con el tema efectivo y escucha los cambios del
 * sistema que llegan del main. Se llama una vez, en App.
 */
export function useThemeSync(): void {
  const resolvedTheme = useUiStore((s) => s.resolvedTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    const { setResolvedTheme } = useUiStore.getState()
    window.api.theme.getResolved().then(setResolvedTheme)
    return window.api.theme.onChanged(setResolvedTheme)
  }, [])
}
