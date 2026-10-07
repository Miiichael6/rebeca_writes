import { useEffect } from 'react'
import type { ErrorCode, TranscribeJob } from '@shared/types'
import { transcribeOptionsFrom } from '@shared/settings'
import { AUTO_LANGUAGE } from '@shared/whisper'
import i18n from '@renderer/i18n'
import { EtaEstimator } from '@renderer/lib/eta'
import { useHistoryStore } from './history'
import { isQueueJob } from './queue'
import { useSettingsStore } from './settings'
import { toast } from './toast'
import {
  appendJobSegments,
  beginJob,
  finishJob,
  updateJobProgress,
  useTranscriptStore
} from './transcript'

/**
 * Puente entre el motor (main) y los stores: lanza y cancela la transcripción del archivo
 * abierto y reparte los eventos `transcribe:*` entre la vista y el historial.
 */

const eta = new EtaEstimator()

/** Por qué no se puede transcribir el archivo abierto, o `null` si se puede. */
export type StartBlocker = 'noMedia' | 'busy'

export function startBlocker(
  entryId: string | undefined,
  hasMedia: boolean,
  runningEntryId: string | undefined
): StartBlocker | null {
  if (!entryId || !hasMedia) return 'noMedia'
  if (runningEntryId && runningEntryId !== entryId) return 'busy'
  return null
}

function showError(code: ErrorCode, detail?: string): void {
  const message = i18n.t(`errors.${code}`)
  toast(detail && code === 'unknown' ? `${message} (${detail})` : message, 6000)
}

/** Transcribe el archivo abierto con el modelo, idioma y opciones actuales. */
export async function startTranscription(): Promise<void> {
  const { entry, job } = useTranscriptStore.getState()
  if (!entry || job) return
  const media = useHistoryStore.getState().media[entry.id]
  if (!media) return

  const s = useSettingsStore.getState().settings
  const request: TranscribeJob = {
    id: crypto.randomUUID(),
    filePath: media.filePath,
    model: s.model,
    language: s.language,
    // Ya no se ofrece traducir al inglés: se transcribe siempre en el idioma original.
    translate: false,
    historyId: entry.id,
    options: transcribeOptionsFrom(s)
  }

  eta.reset()
  beginJob(request.id, entry.id)
  useHistoryStore.getState().patchEntry(entry.id, {
    status: 'transcribing',
    progress: 0,
    model: request.model,
    language: request.language,
    detectedLanguage: undefined
  })
  try {
    await window.api.transcribe.start(request)
  } catch (err) {
    // El IPC en sí falló (no el trabajo): se trata como un error del motor.
    onError(request.id, 'unknown', err instanceof Error ? err.message : String(err))
  }
}

/** Cancela la transcripción en curso. El resultado llega por `transcribe:error` (`cancelled`). */
export function cancelTranscription(): void {
  const { job } = useTranscriptStore.getState()
  if (job) window.api.transcribe.cancel(job.jobId).catch(() => {})
}

function onError(jobId: string, code: ErrorCode, detail?: string): void {
  const { job } = useTranscriptStore.getState()
  if (job?.jobId !== jobId) return
  const cancelled = code === 'cancelled'
  useHistoryStore.getState().patchEntry(job.entryId, {
    status: cancelled ? 'cancelled' : 'error',
    progress: undefined
  })
  finishJob(jobId, { segments: job.segments, error: cancelled ? null : code, cancelled })
  if (cancelled) toast(i18n.t('errors.cancelled'))
  // Los errores de la cola se ven en su panel: la cola sigue sola, sin avisos que cerrar.
  else if (!isQueueJob(jobId)) showError(code, detail)
}

/** Sigue los eventos del motor. Se llama una vez, en App. */
export function useTranscriptionSync(): void {
  useEffect(() => {
    const api = window.api.transcribe
    const offs = [
      api.onSegment(({ jobId, segments }) => appendJobSegments(jobId, segments)),
      api.onProgress(({ jobId, phase, percent }) => {
        const { job } = useTranscriptStore.getState()
        if (job?.jobId !== jobId) return
        // Solo se mide el ritmo de whisper: preparar el audio va a otra velocidad.
        const etaSec = phase === 'transcribing' ? eta.push(percent, performance.now()) : null
        updateJobProgress(jobId, phase, percent, etaSec)
        if (Math.round(percent) !== Math.round(job.progress)) {
          useHistoryStore.getState().patchEntry(job.entryId, { progress: Math.round(percent) })
        }
      }),
      api.onDone(({ jobId, segments, language, backend }) => {
        const { job } = useTranscriptStore.getState()
        if (job?.jobId !== jobId) return
        const history = useHistoryStore.getState()
        const requested = history.entries.find((e) => e.id === job.entryId)?.language
        history.patchEntry(job.entryId, {
          status: 'done',
          progress: undefined,
          backend,
          ...(requested === AUTO_LANGUAGE ? { detectedLanguage: language } : {})
        })
        finishJob(jobId, { segments, error: null })
      }),
      api.onError(({ jobId, code, detail }) => onError(jobId, code, detail))
    ]
    return () => offs.forEach((off) => off())
  }, [])
}
