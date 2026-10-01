import { useEffect, useState } from 'react'
import type { ShortcutError } from '@shared/shortcut'
import {
  captureDone,
  captureResult,
  EMPTY_CAPTURE,
  pressKey,
  type CaptureState
} from '../domain/capture'
import { usePorts } from './ports'

export interface ShortcutCapture {
  capturing: boolean
  /** Lo pulsado hasta ahora, para enseñarlo mientras se captura. */
  pressed: CaptureState
  /** Por qué no valió la última combinación capturada. */
  error: ShortcutError | null
  start: () => void
  cancel: () => void
}

/**
 * Captura un atajo nuevo al pulsarlo: junta todo lo pulsado y, al soltar los modificadores,
 * lo guarda si vale. Escape cancela. Mientras dura, el atajo actual no graba.
 */
export function useShortcutCapture(): ShortcutCapture {
  const { settings, hotkey } = usePorts()
  const [capturing, setCapturing] = useState(false)
  const [pressed, setPressed] = useState(EMPTY_CAPTURE)
  const [error, setError] = useState<ShortcutError | null>(null)

  useEffect(() => {
    if (!capturing) return
    void hotkey.setPaused(true)
    let state = EMPTY_CAPTURE

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') return setCapturing(false)
      state = pressKey(state, event)
      setPressed(state)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      event.preventDefault()
      if (!captureDone(state, event)) return
      const result = captureResult(state)
      if (result.ok) settings.setShortcut(result.shortcut)
      setError(result.ok ? null : result.error)
      setCapturing(false)
    }

    // En captura: antes que los atajos de la página (Escape para salir de Configuración).
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      void hotkey.setPaused(false)
    }
  }, [capturing, settings, hotkey])

  return {
    capturing,
    pressed,
    error,
    start: () => {
      setPressed(EMPTY_CAPTURE)
      setError(null)
      setCapturing(true)
    },
    cancel: () => setCapturing(false)
  }
}
