import { useState } from 'react'
import { actionButton, isLocked, type ActionButton, type Blocker } from '../domain/toolbar'
import { usePorts } from './ports'

export interface TranscribeAction {
  /** Modelo, idioma y traducción no se pueden cambiar. */
  locked: boolean
  button: ActionButton
  blocker: Blocker
  confirmingRestart: boolean
  /** Transcribe, pidiendo confirmación antes si hay ediciones que se perderían. */
  request: () => void
  confirmRestart: () => void
  cancelRestart: () => void
  cancel: () => void
}

/** El botón de transcribir / cancelar y la confirmación de volver a transcribir. */
export function useTranscribeAction(modelIsAvailable: boolean): TranscribeAction {
  const { transcription } = usePorts()
  const status = transcription.useStatus()
  const blocker = transcription.useBlocker()
  const [confirmingRestart, setConfirmingRestart] = useState(false)

  return {
    locked: isLocked(status),
    button: actionButton(status, blocker, modelIsAvailable),
    blocker,
    confirmingRestart,
    request: () => {
      if (transcription.hasEditedSegments()) setConfirmingRestart(true)
      else transcription.start()
    },
    confirmRestart: () => {
      setConfirmingRestart(false)
      transcription.start()
    },
    cancelRestart: () => setConfirmingRestart(false),
    cancel: transcription.cancel
  }
}
