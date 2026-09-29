import { useEffect } from 'react'
import { create } from 'zustand'
import type { UpdateStatus } from '@shared/types'
import i18n from '@renderer/i18n'
import { toast } from './toast'

interface UpdatesState {
  status: UpdateStatus
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
}

export const useUpdatesStore = create<UpdatesState>()(() => ({
  status: { state: 'idle' },
  check: async () => {
    await window.api.updates.check()
  },
  download: async () => {
    await window.api.updates.download()
  },
  install: async () => {
    const result = await window.api.updates.install()
    if (!result.ok && result.reason !== 'notReady') {
      toast(i18n.t(`updates.deferred.${result.reason}`), 8000)
    }
  }
}))

/** Versiones de las que ya se avisó en esta sesión. */
const notified = new Set<string>()

/** Avisos al pasar a `available` (una vez por versión) y a `ready`. */
function notifyTransition(prev: UpdateStatus, next: UpdateStatus): void {
  const { download, install } = useUpdatesStore.getState()
  if (next.state === 'available' && !notified.has(`a${next.version}`)) {
    notified.add(`a${next.version}`)
    toast(i18n.t('updates.available', { version: next.version }), 15_000, {
      label: i18n.t('updates.download'),
      onSelect: () => void download().catch(console.error)
    })
  } else if (next.state === 'ready' && prev.state !== 'ready') {
    // Persistente: dura hasta que se pulsa Reiniciar (o se cierra la app).
    toast(i18n.t('updates.ready'), 10 * 60_000, {
      label: i18n.t('updates.restart'),
      onSelect: () => void install().catch(console.error)
    })
  }
}

/** Carga el estado del actualizador y lo mantiene al día. Se llama una vez, en App. */
export function useUpdatesSync(): void {
  useEffect(() => {
    window.api.updates
      .getStatus()
      .then((status) => useUpdatesStore.setState({ status }))
      .catch((err) => console.error('No se pudo leer el estado de las actualizaciones', err))
    return window.api.updates.onStatus((next) => {
      const prev = useUpdatesStore.getState().status
      useUpdatesStore.setState({ status: next })
      notifyTransition(prev, next)
    })
  }, [])
}
