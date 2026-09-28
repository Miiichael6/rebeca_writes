import { create } from 'zustand'
import type {
  ErrorCode,
  HistoryEntry,
  Segment,
  TranscribePhase,
  TranscriptStatus
} from '@shared/types'
import { editSegment } from '@shared/editSegment'

/** Transcripción en curso. Hay una como mucho: la cola (tarea 17) las lanza de una en una. */
export interface LiveJob {
  jobId: string
  entryId: string
  phase: TranscribePhase
  /** 0–100. */
  progress: number
  /** Segundos restantes estimados, o `null` mientras no hay ritmo suficiente para medir. */
  etaSec: number | null
  /** Segmentos recibidos hasta ahora. */
  segments: Segment[]
}

interface TranscriptState {
  /** Entrada del historial abierta, o `null` si no hay archivo. */
  entry: HistoryEntry | null
  /** Segmentos de la entrada abierta. Si es la que se transcribe, es `job.segments`. */
  segments: Segment[]
  status: TranscriptStatus
  /** Motivo del último fallo de la entrada abierta (`status === 'error'`). */
  error: ErrorCode | null
  job: LiveJob | null
  open: (entry: HistoryEntry | null) => void
}

/**
 * Resultados por id de entrada, para volver a verlos al cambiar de archivo: los de esta
 * sesión y los que se leyeron del historial en disco (`setLoadedResult`).
 */
const results = new Map<string, { segments: Segment[]; error: ErrorCode | null }>()

/**
 * Guarda los segmentos que el main leyó del historial. Solo para entradas terminadas
 * (`done`, `error`, `cancelled`): una pendiente o en curso no tiene resultado que recordar.
 */
export function setLoadedResult(
  entryId: string,
  segments: Segment[],
  error: ErrorCode | null
): void {
  results.set(entryId, { segments, error })
}

/** Olvida los resultados guardados de una entrada (al borrarla) o de todas (`undefined`). */
export function forgetResults(entryId?: string): void {
  if (entryId === undefined) results.clear()
  else results.delete(entryId)
}

function stateFor(
  entry: HistoryEntry | null,
  job: LiveJob | null
): Pick<TranscriptState, 'entry' | 'segments' | 'status' | 'error'> {
  if (!entry) return { entry, segments: [], status: 'idle', error: null }
  if (job?.entryId === entry.id) {
    return { entry, segments: job.segments, status: 'transcribing', error: null }
  }
  const saved = results.get(entry.id)
  if (saved) {
    // El motivo del fallo no se guarda en disco: una entrada `error` cargada lo tiene en `null`.
    if (saved.error || entry.status === 'error') {
      return { entry, segments: saved.segments, status: 'error', error: saved.error }
    }
    // Cancelada: se conserva lo que llegó a salir y se puede volver a lanzar.
    if (entry.status === 'cancelled') {
      return { entry, segments: saved.segments, status: 'ready', error: null }
    }
    return { entry, segments: saved.segments, status: 'done', error: null }
  }
  switch (entry.status) {
    // `done` sin resultado aún: `history:get` está leyendo los segmentos.
    case 'done':
      return { entry, segments: [], status: 'done', error: null }
    case 'error':
      return { entry, segments: [], status: 'error', error: null }
    // Una entrada en `transcribing` sin trabajo vivo quedó cortada: se puede volver a lanzar.
    default:
      return { entry, segments: [], status: 'ready', error: null }
  }
}

export const useTranscriptStore = create<TranscriptState>()((set, get) => ({
  ...stateFor(null, null),
  job: null,
  open: (entry) => set(stateFor(entry, get().job))
}))

/** ¿Se muestra la entrada que se está transcribiendo? */
function showsJob(state: TranscriptState, job: LiveJob): boolean {
  return state.entry?.id === job.entryId
}

/** Empieza un trabajo nuevo para `entryId`. */
export function beginJob(jobId: string, entryId: string): void {
  const job: LiveJob = {
    jobId,
    entryId,
    phase: 'preparing',
    progress: 0,
    etaSec: null,
    segments: []
  }
  results.delete(entryId)
  useTranscriptStore.setState((s) =>
    showsJob(s, job)
      ? { job, segments: job.segments, status: 'transcribing', error: null }
      : { job }
  )
}

/**
 * Añade segmentos al trabajo en curso. El main ya los agrupa (un evento cada ~100 ms), así
 * que se copia el array una vez por lote y no por segmento; mantenerlo inmutable hace que
 * los selectores y `useMemo` que dependen de `segments` (búsqueda, unir líneas) se enteren.
 */
export function appendJobSegments(jobId: string, segments: Segment[]): void {
  const { job } = useTranscriptStore.getState()
  if (job?.jobId !== jobId || segments.length === 0) return
  const next: LiveJob = { ...job, segments: job.segments.concat(segments) }
  useTranscriptStore.setState((s) =>
    showsJob(s, next) ? { job: next, segments: next.segments } : { job: next }
  )
}

export function updateJobProgress(
  jobId: string,
  phase: TranscribePhase,
  progress: number,
  etaSec: number | null
): void {
  const { job } = useTranscriptStore.getState()
  if (job?.jobId !== jobId) return
  useTranscriptStore.setState({ job: { ...job, phase, progress, etaSec } })
}

/**
 * Cierra el trabajo. `segments` es el resultado completo (al terminar bien) o lo que llegó
 * antes de cancelar o fallar. `error` es `null` si terminó bien o se canceló.
 */
export function finishJob(
  jobId: string,
  outcome: { segments: Segment[]; error: ErrorCode | null; cancelled?: boolean }
): void {
  const state = useTranscriptStore.getState()
  const { job } = state
  if (job?.jobId !== jobId) return
  if (!outcome.cancelled) {
    results.set(job.entryId, { segments: outcome.segments, error: outcome.error })
  }
  if (!showsJob(state, job)) {
    useTranscriptStore.setState({ job: null })
    return
  }
  useTranscriptStore.setState({
    job: null,
    segments: outcome.segments,
    // Cancelado: se conserva lo que llegó a salir y se puede volver a lanzar.
    status: outcome.cancelled ? 'ready' : outcome.error ? 'error' : 'done',
    error: outcome.error
  })
}

/** ¿Se puede editar la transcripción abierta? No mientras ese mismo archivo se transcribe. */
export function canEdit(state: TranscriptState): boolean {
  return state.entry !== null && state.job?.entryId !== state.entry.id
}

/**
 * Cambia el texto de un segmento de la entrada abierta en memoria. El array se reemplaza, así
 * búsqueda, copiar, unir líneas y subtítulos lo ven. Devuelve el id de la entrada si cambió
 * algo (para guardarlo en el historial), si no `null`. Ver `lib/editTranscript.ts`.
 */
export function applySegmentEdit(index: number, text: string): string | null {
  const state = useTranscriptStore.getState()
  const { entry, segments } = state
  const current = segments[index]
  if (!entry || !current || !canEdit(state) || current.text === text) return null
  const next = segments.slice()
  next[index] = editSegment(current, text)
  // Para verla igual al volver a este archivo en la sesión.
  if (state.status === 'done' || state.status === 'error') {
    results.set(entry.id, { segments: next, error: state.error })
  }
  useTranscriptStore.setState({ segments: next })
  return entry.id
}
