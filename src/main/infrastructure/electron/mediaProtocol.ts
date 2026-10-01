import { protocol } from 'electron'
import { MEDIA_SCHEME } from '@shared/media'
import { createMediaHandler } from '../media/mediaHandler'

/**
 * Privilegios del esquema. Tiene que llamarse antes de `app.whenReady` (Electron lo exige).
 * `stream` permite a `<video>` pedir por rangos; `secure` evita avisos de contenido mixto.
 */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true }
    }
  ])
}

/** Conecta el handler con Range a la lista blanca. Llamar dentro de `app.whenReady`. */
export function handleMediaProtocol(resolve: (id: string) => string | null): void {
  protocol.handle(MEDIA_SCHEME, createMediaHandler(resolve))
}
