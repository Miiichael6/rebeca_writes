import { useEffect } from 'react'
import { create } from 'zustand'
import type { UiLanguageSetting } from '@shared/i18n'
import type { ResolvedTheme, ThemeMode } from '@shared/theme'
import { AUTO_LANGUAGE } from '@shared/whisper'
import i18n, { resolveUiLanguage } from '@renderer/i18n'

export type View = 'main' | 'settings'

/** Límites de la altura del panel de video (spec §4.1). */
export const VIDEO_HEIGHT_MIN = 300
export const VIDEO_HEIGHT_MAX = 600

interface UiState {
  /** Lo que eligió el usuario. Se persistirá en settings.json (tarea 12). */
  themeMode: ThemeMode
  /** Tema aplicado de verdad; lo decide el main con `nativeTheme`. */
  resolvedTheme: ResolvedTheme
  setThemeMode: (mode: ThemeMode) => void
  setResolvedTheme: (theme: ResolvedTheme) => void

  /** Idioma de la interfaz elegido. Se persistirá en settings.json (tarea 12). */
  uiLanguage: UiLanguageSetting
  setUiLanguage: (language: UiLanguageSetting) => void

  view: View
  setView: (view: View) => void
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  videoVisible: boolean
  toggleVideo: () => void
  /** Altura del panel de video en px (300–600). Se ajusta en Configuración (tarea 21). */
  videoHeight: number
  setVideoHeight: (height: number) => void

  // Opciones de la barra superior e inferior. Se persistirán en settings.json (tarea 12).
  model: string
  setModel: (model: string) => void
  language: string
  setLanguage: (language: string) => void
  translate: boolean
  setTranslate: (translate: boolean) => void
  joinLines: boolean
  setJoinLines: (joinLines: boolean) => void
  autoScroll: boolean
  setAutoScroll: (autoScroll: boolean) => void
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
  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),

  uiLanguage: 'system',
  setUiLanguage: (uiLanguage) => {
    set({ uiLanguage })
    // react-i18next vuelve a pintar todo lo que usa `t`: no hace falta reiniciar.
    i18n.changeLanguage(resolveUiLanguage(uiLanguage))
  },

  view: 'main',
  setView: (view) => set({ view }),
  queueOpen: false,
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  videoVisible: true,
  toggleVideo: () => set((s) => ({ videoVisible: !s.videoVisible })),
  videoHeight: 360,
  setVideoHeight: (height) =>
    set({ videoHeight: Math.min(VIDEO_HEIGHT_MAX, Math.max(VIDEO_HEIGHT_MIN, height)) }),

  model: 'small',
  setModel: (model) => set({ model }),
  language: AUTO_LANGUAGE,
  setLanguage: (language) => set({ language }),
  translate: false,
  setTranslate: (translate) => set({ translate }),
  joinLines: true,
  setJoinLines: (joinLines) => set({ joinLines }),
  autoScroll: true,
  setAutoScroll: (autoScroll) => set({ autoScroll })
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
