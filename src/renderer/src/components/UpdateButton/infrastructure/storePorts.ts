import { useUpdatesStore } from '@renderer/store/updates'
import type { UpdateButtonPorts } from '../application/ports'

/** Adaptadores de los puertos sobre el store de actualizaciones. Es el único sitio que lo conoce. */
export const storePorts: UpdateButtonPorts = {
  updates: {
    useStatus: () => useUpdatesStore((s) => s.status),
    download: () => useUpdatesStore.getState().download(),
    install: () => useUpdatesStore.getState().install()
  }
}
