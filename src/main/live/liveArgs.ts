/**
 * Órdenes de Rebecca Listen por línea de comandos (tarea 27): la grabación empezó
 * (`--live-start <pcm> --live-name <nombre>`) o terminó (`--live-end <pcm> [--live-media <archivo>]`).
 * Sin `--live-media` la grabación se abortó y no hay archivo final.
 */

import { win32 } from 'path'

export type LiveCommand =
  { kind: 'start'; pcm: string; name: string } | { kind: 'end'; pcm: string; media: string | null }

const START = '--live-start'
const NAME = '--live-name'
const END = '--live-end'
const MEDIA = '--live-media'

/**
 * Valor de `flag`, o `null` si no está o viene vacío u otra opción. Listen manda `--flag=valor`:
 * en `second-instance` Chromium pone las opciones delante y los sueltos al final, así que
 * `--flag valor` solo sirve al arrancar en frío.
 */
function valueOf(argv: readonly string[], flag: string): string | null {
  const joined = argv.find((arg) => arg.startsWith(`${flag}=`))
  if (joined) return joined.slice(flag.length + 1) || null
  const index = argv.indexOf(flag)
  const value = index === -1 ? undefined : argv[index + 1]
  return value && !value.startsWith('--') ? value : null
}

/** La orden en vivo del argv, o `null` si no trae ninguna (entonces es un "Abrir con"). */
export function parseLiveCommand(argv: readonly string[]): LiveCommand | null {
  const started = valueOf(argv, START)
  if (started) {
    return { kind: 'start', pcm: started, name: valueOf(argv, NAME) ?? win32.basename(started) }
  }
  const ended = valueOf(argv, END)
  if (ended) return { kind: 'end', pcm: ended, media: valueOf(argv, MEDIA) }
  return null
}

/** El argv trae alguna opción `--live-*`: nunca se encola como archivo. */
export function isLiveArgv(argv: readonly string[]): boolean {
  return argv.some((arg) => arg.startsWith('--live-'))
}
