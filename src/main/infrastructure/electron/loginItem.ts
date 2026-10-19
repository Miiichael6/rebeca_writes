import { app } from 'electron'
import type { Logger } from '../../application/ports/eventPublisher'
import type { SettingsRepository } from '../../application/ports/settingsRepository'

/** Con esta opción la app arranca sin ventana, solo con el dock (al iniciar Windows). */
export const HIDDEN_ARG = '--hidden'

/** La app se abrió sola al iniciar sesión en Windows (tarea 40). */
export function openedAtLogin(argv: readonly string[]): boolean {
  return argv.includes(HIDDEN_ARG)
}

/**
 * "Iniciar con Windows" (tarea 40): el ajuste `openAtLogin` sigue a la entrada de inicio de
 * Windows y la cambia al tocarlo. Lo que manda es Windows: si se desactivó desde el Administrador
 * de tareas, el ajuste se apaga al arrancar. Sin empaquetar no hace nada (registraría
 * `electron.exe`).
 */
export function followOpenAtLogin(settings: SettingsRepository, log: Logger): void {
  if (!app.isPackaged) return
  let current = app.getLoginItemSettings({ args: [HIDDEN_ARG] }).executableWillLaunchAtLogin
  if (settings.get().openAtLogin !== current)
    settings
      .update({ openAtLogin: current })
      .catch((err) => log.error('No se pudo guardar el ajuste de iniciar con Windows', err))
  settings.onChanged(({ openAtLogin }) => {
    if (openAtLogin === current) return
    current = openAtLogin
    app.setLoginItemSettings({ openAtLogin, args: [HIDDEN_ARG] })
    log.info(`Iniciar con Windows: ${openAtLogin ? 'activado' : 'desactivado'}`)
  })
}
