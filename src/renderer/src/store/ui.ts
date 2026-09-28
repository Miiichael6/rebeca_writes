import { useEffect } from 'react'
import { create } from 'zustand'
import type { ResolvedTheme, ThemeMode } from '@shared/theme'

interface UiState {
  /** Lo que eligió el usuario. Se persistirá en settings.json (tarea 12). */
  themeMode: ThemeMode
  /** Tema aplicado de verdad; lo decide el main con `nativeTheme`. */
  resolvedTheme: ResolvedTheme
  setThemeMode: (mode: ThemeMode) => void
  setResolvedTheme: (theme: ResolvedTheme) => void
}

/** Tema inicial antes de hablar con el main. Chromium ya refleja `nativeTheme` en esta media query. */
function initialTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUiStore = create<UiState>()((set) => ({
  themeMode: 'system',
  resolvedTheme: initialTheme(),
  setThemeMode: (mode) => {
    set({ themeMode: mode })
    window.api.theme.setMode(mode).then((theme) => set({ resolvedTheme: theme }))
  },
  setResolvedTheme: (theme) => set({ resolvedTheme: theme })
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
