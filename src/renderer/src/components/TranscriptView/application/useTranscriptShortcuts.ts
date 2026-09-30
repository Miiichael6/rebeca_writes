import { useEffect, useRef } from 'react'
import { isCopyShortcut, isFindShortcut } from '../domain/keyboard'
import { usePorts } from './ports'
import type { TranscriptSearch } from './useTranscriptSearch'

/**
 * Atajos y foco de la vista: Ctrl+F enfoca el cuadro de búsqueda, sus teclas navegan las
 * coincidencias y Ctrl+C copia la transcripción. También lleva la coincidencia actual a la vista.
 */
export function useTranscriptShortcuts({
  matches,
  current,
  flush,
  step,
  setQuery
}: TranscriptSearch): {
  inputRef: React.RefObject<HTMLInputElement | null>
  onSectionKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSearchFocus: (e: React.FocusEvent<HTMLInputElement>) => void
} {
  const { transcript, scroll } = usePorts()
  const inputRef = useRef<HTMLInputElement>(null)
  /** Dónde estaba el foco antes de entrar al cuadro, para devolverlo con Esc. */
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // Lleva la coincidencia actual a la vista. Depende del objeto: al llegar segmentos nuevos
  // las coincidencias viejas se conservan y la lista no salta.
  const currentMatch = matches[current] ?? null
  useEffect(() => {
    if (currentMatch) scroll.scrollTo(currentMatch.segmentIndex, 'center')
  }, [currentMatch, scroll])

  // Ctrl+F enfoca el cuadro desde cualquier parte de la vista principal.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!isFindShortcut(e)) return
      if (document.querySelector('dialog[open]')) return
      const input = inputRef.current
      if (!input || input.disabled) return
      e.preventDefault()
      input.focus()
      input.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'Enter':
        // Si lo escrito aún no se buscó, Enter lo busca y se queda en la primera.
        if (!flush()) step(e.shiftKey ? -1 : 1)
        break
      case 'ArrowDown':
        if (!flush()) step(1)
        break
      case 'ArrowUp':
        if (!flush()) step(-1)
        break
      case 'Escape': {
        setQuery('')
        const back = returnFocusRef.current
        if (back?.isConnected) back.focus()
        else e.currentTarget.blur()
        break
      }
      default:
        return
    }
    e.preventDefault()
  }

  const onSearchFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
    returnFocusRef.current = e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null
  }

  // Ctrl+C con el foco en la transcripción: sin selección copia todo (como se ve); con
  // selección se deja la copia nativa. En el cuadro de búsqueda copia lo de siempre.
  const onSectionKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (!isCopyShortcut(e)) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (window.getSelection()?.toString()) return
    e.preventDefault()
    void transcript.copyAll()
  }

  return { inputRef, onSectionKeyDown, onSearchKeyDown, onSearchFocus }
}
