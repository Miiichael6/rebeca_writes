import type { ResolvedTheme, ThemeMode } from './theme'
import type { BackendFallback, BackendInfo } from './types'

/** Canales IPC. El renderer nunca los usa directamente: pasa por `window.api`. */
export const IpcChannel = {
  AppGetVersion: 'app:get-version',
  AppGetPreferredLanguages: 'app:get-preferred-languages',
  ThemeGetResolved: 'theme:get-resolved',
  ThemeSetMode: 'theme:set-mode',
  ThemeChanged: 'theme:changed',
  BackendGetInfo: 'backend:get-info',
  BackendFallback: 'backend:fallback'
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]

/** Firma de cada canal `invoke` (renderer → main): argumentos y valor de retorno. */
export interface IpcInvokeMap {
  [IpcChannel.AppGetVersion]: { args: []; result: string }
  [IpcChannel.AppGetPreferredLanguages]: { args: []; result: string[] }
  [IpcChannel.ThemeGetResolved]: { args: []; result: ResolvedTheme }
  [IpcChannel.ThemeSetMode]: { args: [mode: ThemeMode]; result: ResolvedTheme }
  [IpcChannel.BackendGetInfo]: { args: []; result: BackendInfo }
}

/** Eventos que el main envía al renderer (`webContents.send`) y su payload. */
export interface IpcEventMap {
  [IpcChannel.ThemeChanged]: ResolvedTheme
  [IpcChannel.BackendFallback]: BackendFallback
}

/** API que el preload expone en `window.api`. */
export interface TranscribaApi {
  app: {
    getVersion: () => Promise<string>
    /** Idiomas preferidos de Windows (BCP 47), del más al menos preferido. */
    getPreferredLanguages: () => Promise<string[]>
  }
  theme: {
    getResolved: () => Promise<ResolvedTheme>
    /** Aplica el modo en `nativeTheme.themeSource` y devuelve el tema resultante. */
    setMode: (mode: ThemeMode) => Promise<ResolvedTheme>
    /** Avisa cuando cambia el tema efectivo (p. ej. el usuario cambia el tema de Windows). */
    onChanged: (listener: (theme: ResolvedTheme) => void) => () => void
  }
  backend: {
    /** Espera a la autodetección del primer arranque si todavía no terminó. */
    getInfo: () => Promise<BackendInfo>
    /** Avisa cuando un backend falla al cargar y se reintenta con el siguiente. */
    onFallback: (listener: (fallback: BackendFallback) => void) => () => void
  }
}
