import { useEffect } from 'react'
import type { HistoryEntry } from '@shared/types'
import { isRenameShortcut } from '../domain/interaction'

/**
 * F2 abre "Renombrar" para la entrada seleccionada del historial. No hace nada si hay un
 * diálogo abierto o se está escribiendo en un campo (el filtro, un segmento en edición...).
 */
export function useRenameShortcut(
  selected: HistoryEntry | undefined,
  startRename: (entry: HistoryEntry) => void
): void {
  useEffect(() => {
    if (!selected) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!isRenameShortcut(e) || document.querySelector('dialog[open]')) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      startRename(selected)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, startRename])
}
