import { announceQueued } from '@renderer/store/queue'
import type { DropOverlayPorts } from '../application/ports'

/** Adaptadores de los puertos sobre `window.api` y el store de la cola. Es el único sitio que los conoce. */
export const storePorts: DropOverlayPorts = {
  drops: {
    addToQueue: async (files) => announceQueued(await window.api.queue.addDropped(files))
  }
}
