import { useEffect, useState } from 'react'
import { clipRangeError, clockText, parseClock, type ClipRangeError } from '../domain/clip'
import { usePorts } from './ports'

/** Forma de onda: `loading` mientras ffmpeg la calcula, `null` si no se pudo. */
export type WaveformState = number[] | null | 'loading'

export interface ClipDialog {
  open: boolean
  show: () => void
  close: () => void
  startText: string
  endText: string
  setStartText: (text: string) => void
  setEndText: (text: string) => void
  /** Pone en el campo la posición actual del reproductor. */
  startHere: () => void
  endHere: () => void
  /** Elige el tramo entero de una vez (arrastrando sobre la forma de onda). */
  setRange: (start: number, end: number) => void
  transcribe: boolean
  setTranscribe: (value: boolean) => void
  /** Tramo escrito en segundos (cada extremo `null` si no se entiende). */
  start: number | null
  end: number | null
  duration: number
  /** Duración del tramo en segundos, o `null` si no es válido. */
  length: number | null
  error: ClipRangeError | null
  waveform: WaveformState
  confirm: () => void
}

/**
 * Diálogo "Recortar" (tarea 39): empieza en la posición actual y acaba al final del archivo.
 * Al abrirlo pide la forma de onda para ver dónde hay voz. El recorte lo escribe el main.
 */
export function useClipDialog(entryId: string | undefined): ClipDialog {
  const { playback, clip } = usePorts()
  const [open, setOpen] = useState(false)
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [transcribe, setTranscribe] = useState(false)
  const [waveform, setWaveform] = useState<{ id: string; peaks: number[] | null } | null>(null)
  const duration = playback.useDuration()

  useEffect(() => {
    if (!open || !entryId || waveform?.id === entryId) return
    let alive = true
    clip
      .waveform(entryId)
      .catch(() => null)
      .then((peaks) => {
        if (alive) setWaveform({ id: entryId, peaks })
      })
    return () => {
      alive = false
    }
  }, [open, entryId, waveform?.id, clip])

  const start = parseClock(startText)
  const end = parseClock(endText)
  const error = clipRangeError(start, end, duration)
  const now = (): string => clockText(playback.getCurrentTime())

  return {
    open,
    show: () => {
      setStartText(now())
      setEndText(clockText(Math.ceil(duration)))
      setOpen(true)
    },
    close: () => setOpen(false),
    startText,
    endText,
    setStartText,
    setEndText,
    startHere: () => setStartText(now()),
    endHere: () => setEndText(now()),
    setRange: (from, to) => {
      setStartText(clockText(from))
      setEndText(clockText(Math.ceil(to)))
    },
    transcribe,
    setTranscribe,
    start,
    end,
    duration,
    length: error === null && start !== null && end !== null ? end - start : null,
    error,
    waveform: waveform && waveform.id === entryId ? waveform.peaks : 'loading',
    confirm: () => {
      if (error !== null || start === null || end === null || !entryId) return
      setOpen(false)
      void clip.cut(entryId, start, end, transcribe)
    }
  }
}
