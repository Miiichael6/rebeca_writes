import { rm } from 'fs/promises'
import { resolve } from 'path'
import log from 'electron-log/main'
import type { LiveSessionInfo } from '@shared/types'
import { addPathsToQueue } from '../services/queue'
import type { LiveCommand } from './liveArgs'
import { cancelAllChunks } from './liveEngine'
import { LiveSession } from './liveSession'

/**
 * Qué hacer con cada orden de Rebecca Listen (tarea 27). Hay una sesión en vivo a la vez: si
 * empieza otra grabación, la anterior se cierra con lo que tenga.
 */

let session: LiveSession | null = null

function samePath(a: string, b: string): boolean {
  return resolve(a).toLowerCase() === resolve(b).toLowerCase()
}

function forget(finished: LiveSession): void {
  if (session === finished) session = null
}

export async function handleLiveCommand(command: LiveCommand): Promise<void> {
  if (command.kind === 'start') {
    if (session && samePath(session.pcm, command.pcm)) return
    session?.end(null)
    session = await LiveSession.start(command.pcm, command.name, forget)
    return
  }
  if (session && samePath(session.pcm, command.pcm)) {
    session.end(command.media)
    return
  }
  // No se vio el inicio (p. ej. falló al abrirse): la grabación se transcribe como un archivo más.
  log.info(`En vivo: fin sin sesión para ${command.pcm}; la grabación va a la cola`)
  if (command.media) await addPathsToQueue([command.media])
  await rm(command.pcm, { force: true })
}

/** `live:current`: la sesión en curso, para la ventana que carga después de que empezara. */
export function currentLiveSession(): LiveSessionInfo | null {
  return session?.info() ?? null
}

/** "Cancelar" con la entrada en vivo abierta. `false` si `jobId` no es la sesión en vivo. */
export function cancelLiveSession(jobId: string): boolean {
  if (session?.jobId !== jobId) return false
  session.cancel()
  return true
}

/** Al cerrar la app: la entrada queda con lo transcrito (ver `restoreEntry`). */
export function stopLiveSessions(): void {
  cancelAllChunks()
}
