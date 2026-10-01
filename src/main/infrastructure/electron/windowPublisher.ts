import { BrowserWindow } from 'electron'
import type { EventPublisher } from '../../application/ports/eventPublisher'

/** Adaptador de `EventPublisher`: manda el mensaje a todas las ventanas abiertas. */
export const windowPublisher: EventPublisher = {
  publish(channel, payload) {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
  }
}
