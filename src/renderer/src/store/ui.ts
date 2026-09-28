import { useEffect } from 'react'
import { create } from 'zustand'
import type { ResolvedTheme } from '@shared/theme'

export type View = 'main' | 'settings'

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
  toggleVideo: () => set((s) => ({ videoVisible: !s.videoVisible }))
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
