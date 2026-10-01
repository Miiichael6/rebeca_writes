/**
 * Las apps de llamadas que cuentan como reunión (tarea 32, D11). Sin navegadores: usan el
 * micrófono para muchas cosas que no son llamadas. Cualquier otra app con el micrófono (un
 * juego, un dictado, el propio `rl-capture.exe`) tampoco es una reunión.
 */

/** Nombre del .exe en minúsculas → nombre de la app. */
const CALL_EXES: Record<string, string> = {
  'ms-teams.exe': 'Teams',
  'teams.exe': 'Teams',
  'zoom.exe': 'Zoom',
  'ciscocollabhost.exe': 'Webex',
  'webexmta.exe': 'Webex',
  'atmgr.exe': 'Webex',
  'slack.exe': 'Slack',
  'discord.exe': 'Discord',
  'skype.exe': 'Skype'
}

/** Nombre de familia del paquete sin el hash del editor (`MSTeams_8wekyb3d8bbwe` → `MSTeams`). */
const CALL_PACKAGES: Record<string, string> = {
  MSTeams: 'Teams',
  MicrosoftTeams: 'Teams',
  'Microsoft.SkypeApp': 'Skype',
  'Zoom.ZoomRooms': 'Zoom'
}

/** Separador de carpetas en las claves `NonPackaged` del registro (`C:#Users#...#Zoom.exe`). */
const NON_PACKAGED_SEPARATOR = '#'
const EXE_SUFFIX = '.exe'

/**
 * La app de llamadas detrás de una clave del registro del micrófono, o `null` si no es una. La
 * clave es el nombre de familia del paquete o, para apps de escritorio, la ruta del .exe.
 */
export function callAppName(registryKey: string): string | null {
  const name = registryKey.slice(registryKey.lastIndexOf(NON_PACKAGED_SEPARATOR) + 1)
  if (name.toLowerCase().endsWith(EXE_SUFFIX)) return CALL_EXES[name.toLowerCase()] ?? null
  const hash = name.lastIndexOf('_')
  return CALL_PACKAGES[hash > 0 ? name.slice(0, hash) : name] ?? null
}

/** Las apps de llamadas entre las que usan el micrófono, una vez cada una. */
export function callAppsIn(registryKeys: readonly string[]): string[] {
  const names = registryKeys.map(callAppName).filter((name): name is string => name !== null)
  return [...new Set(names)]
}
