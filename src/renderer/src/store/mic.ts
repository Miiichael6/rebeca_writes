import { useEffect } from 'react'
import { create } from 'zustand'
import type { MicStartError, MicState, RecordingSource } from '@shared/recording'
import i18n from '@renderer/i18n'
import { toast } from './toast'

/**
 * Grabar desde la app (tarea 29). La grabación vive en el main; aquí solo se refleja su estado.
 * La entrada en vivo llega por `live:started` como las de Rebecca Listen (`useLiveSync`).
 */

interface MicStore {
  state: MicState
  /** Entre pulsar y que el main conteste: el botón no admite otro clic. */
  pending: boolean
}

export const useMicStore = create<MicStore>()(() => ({
  state: { recording: false },
  pending: false
}))

const TOAST_MS = 6000

const ERROR_KEYS = {
  liveBusy: 'mic.errorLiveBusy',
  noDevice: 'mic.errorNoDevice',
  failed: 'mic.errorFailed'
} as const satisfies Record<MicStartError, string>

function changed(state: MicState): void {
  useMicStore.setState({ state })
  if (!state.recording && state.interrupted) toast(i18n.t('mic.interrupted'), TOAST_MS)
}

async function whilePending(task: () => Promise<void>): Promise<void> {
  if (useMicStore.getState().pending) return
  useMicStore.setState({ pending: true })
  try {
    await task()
  } catch (err) {
    console.error(err)
    toast(i18n.t(ERROR_KEYS.failed), TOAST_MS)
  } finally {
    useMicStore.setState({ pending: false })
  }
}

/** `name` es el de la entrada (y del MP3), ya traducido. */
export function startMic(source: RecordingSource, name: string): Promise<void> {
  return whilePending(async () => {
    const result = await window.api.mic.start(source, name)
    if (result.ok) useMicStore.setState({ state: result.state })
    else toast(i18n.t(ERROR_KEYS[result.error]), TOAST_MS)
  })
}

export function stopMic(): Promise<void> {
  return whilePending(() => window.api.mic.stop())
}

/** Sigue el estado de la grabación. Se llama una vez, en App. */
export function useMicSync(): void {
  useEffect(() => {
    const off = window.api.mic.onChanged(changed)
    void window.api.mic
      .getState()
      .then((state) => useMicStore.setState({ state }))
      .catch(() => {})
    return off
  }, [])
}
