import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RecordingSource } from '@shared/recording'
import { elapsedLabel, micButtonState, recordingStamp, type MicButtonState } from '../domain/mic'
import { usePorts } from './ports'

const TICK_MS = 1000

export interface MicAction {
  button: MicButtonState
  /** Contador `m:ss` mientras graba; vacío si no. */
  elapsed: string
  source: RecordingSource
  sourceLabel: (source: RecordingSource) => string
  chooseSource: (source: RecordingSource) => void
  toggle: () => void
}

/** Hora actual que se refresca cada segundo mientras `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // Hasta el primer tic el contador marca 0:00 (`formatClock` no baja de cero).
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [active])
  return now
}

/** Botón de grabar: empezar con la fuente elegida, parar, y el menú de fuentes. */
export function useMicAction(): MicAction {
  const { t } = useTranslation()
  const { mic } = usePorts()
  const button = micButtonState(mic.useState(), mic.useLiveSession(), mic.usePending())
  const source = mic.useSource()
  const now = useNow(button.kind === 'recording')
  const sourceLabel = (s: RecordingSource): string => t(`mic.sources.${s}`)

  return {
    button,
    elapsed: button.kind === 'recording' ? elapsedLabel(button.startedAt, now) : '',
    source,
    sourceLabel,
    chooseSource: mic.setSource,
    toggle: () => {
      if (button.kind === 'recording') return mic.stop()
      const name = t('mic.entryName', {
        date: recordingStamp(new Date()),
        source: sourceLabel(source)
      })
      mic.start(source, name)
    }
  }
}
