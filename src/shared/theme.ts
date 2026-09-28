/** Tema elegido por el usuario. `system` sigue a Windows (`nativeTheme`). */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Tema que se está aplicando de verdad. */
export type ResolvedTheme = 'light' | 'dark'

/** Alto de la barra de título propia; también el de los controles nativos (`titleBarOverlay`). */
export const TITLE_BAR_HEIGHT = 40

/**
 * Colores que el proceso principal necesita sin leer CSS: fondo de la ventana y de los botones
 * nativos de la barra de título. Deben coincidir con `--bg-app-top` y `--text-1` de theme-*.css.
 */
export const WINDOW_COLORS: Record<ResolvedTheme, { background: string; symbol: string }> = {
  light: { background: '#e3efe9', symbol: '#1b1b1b' },
  dark: { background: '#1c2622', symbol: '#f2f2f2' }
}
