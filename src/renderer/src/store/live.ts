import { useEffect } from 'react'
import type { LiveEndedEvent, LiveSessionInfo } from '@shared/types'
import i18n from '@renderer/i18n'
import { useHistoryStore } from './history'
import { toast } from './toast'
import { beginJob, useTranscriptStore } from './transcript'

/**
 * Transcripción en vivo de una grabación de Rebecca Listen (tarea 27). La sesión vive en el
 * main; aquí su entrada se muestra y se abre sola, y sus segmentos llegan por `transcribe:*`
 * como los de cualquier trabajo (`useTranscriptionSync`).
 */

function follow({ jobId, entry, segments }: LiveSessionInfo): void {
  if (useTranscriptStore.getState().job?.jobId === jobId) return
  const history = useHistoryStore.getState()
  history.upsertEntry(entry)
  beginJob(jobId, entry.id, { live: true, segments })
  history.select(entry.id)
}

/** La entrada ya apunta a la grabación final: se vuelve a abrir para cargar su audio. */
function ended({ entry, interrupted }: LiveEndedEvent): void {
  const history = useHistoryStore.getState()
  history.patchEntry(entry.id, { ...entry, live: undefined })
  if (history.selectedId === entry.id) history.select(entry.id)
  if (interrupted) toast(i18n.t('live.interrupted'), 6000)
}

/** Sigue las sesiones en vivo. Se llama una vez, en App. */
export function useLiveSync(): void {
  useEffect(() => {
    const api = window.api.live
    const offs = [api.onStarted(follow), api.onEnded(ended)]
    // La sesión pudo empezar antes que la ventana (Listen abrió RebeccaWrites al grabar).
    void api
      .current()
      .then((info) => info && follow(info))
      .catch(() => {})
    return () => offs.forEach((off) => off())
  }, [])
}
