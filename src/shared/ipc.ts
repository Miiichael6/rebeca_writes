import type { ResolvedTheme, ThemeMode } from './theme'

/** Canales IPC. El renderer nunca los usa directamente: pasa por `window.api`. */
export const IpcChannel = {
  AppGetVersion: 'app:get-version',
  ThemeGetResolved: 'theme:get-resolved',
  ThemeSetMode: 'theme:set-mode',
  ThemeChanged: 'theme:changed'
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]

/** Firma de cada canal `invoke` (renderer → main): argumentos y valor de retorno. */
export interface IpcInvokeMap {
  [IpcChannel.AppGetVersion]: { args: []; result: string }
  [IpcChannel.ThemeGetResolved]: { args: []; result: ResolvedTheme }
  [IpcChannel.ThemeSetMode]: { args: [mode: ThemeMode]; result: ResolvedTheme }
}

/** Eventos que el main envía al renderer (`webContents.send`) y su payload. */
export interface IpcEventMap {
  [IpcChannel.ThemeChanged]: ResolvedTheme
}

/** API que el preload expone en `window.api`. */
export interface TranscribaApi {
  app: {
    getVersion: () => Promise<string>
  }
  theme: {
    getResolved: () => Promise<ResolvedTheme>
    /** Aplica el modo en `nativeTheme.themeSource` y devuelve el tema resultante. */
    setMode: (mode: ThemeMode) => Promise<ResolvedTheme>
    /** Avisa cuando cambia el tema efectivo (p. ej. el usuario cambia el tema de Windows). */
    onChanged: (listener: (theme: ResolvedTheme) => void) => () => void
  }
}
