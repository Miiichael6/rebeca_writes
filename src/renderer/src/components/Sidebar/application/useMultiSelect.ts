import { useEffect, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
import { toggleChecked, visibleChecked, type Checked } from '../domain/selection'
import { usePorts } from './ports'

export interface MultiSelect {
  /** Modo de selección múltiple activo. */
  active: boolean
  isChecked: (id: string) => boolean
  /** Marcados que siguen a la vista. */
  count: number
  begin: (id: string) => void
  toggle: (id: string) => void
  end: () => void
  selectAll: () => void
  confirmingRemove: boolean
  askRemove: () => void
  cancelRemove: () => void
  removeChecked: () => Promise<void>
}

/**
 * Selección múltiple del historial: se entra con una pulsación larga, Esc sale, y se pueden
 * borrar los marcados.
 */
export function useMultiSelect(
  filtered: readonly HistoryEntry[],
  visibleIds: ReadonlySet<string>
): MultiSelect {
  const { history } = usePorts()
  const [checked, setChecked] = useState<Checked>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  // Esc sale del modo, salvo que haya un diálogo abierto (que ya usa Esc para cerrarse).
  useEffect(() => {
    if (!checked) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setChecked(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [checked])

  const removeChecked = async (): Promise<void> => {
    const ids = visibleChecked(checked, visibleIds)
    setConfirmingRemove(false)
    setChecked(null)
    // De una en una: cada baja reescribe el historial en el main.
    for (const id of ids) await history.remove(id)
  }

  return {
    active: checked !== null,
    isChecked: (id) => checked?.has(id) ?? false,
    count: visibleChecked(checked, visibleIds).length,
    begin: (id) => setChecked(new Set([id])),
    toggle: (id) => setChecked((prev) => toggleChecked(prev, id)),
    end: () => setChecked(null),
    selectAll: () => setChecked(new Set(filtered.map((e) => e.id))),
    confirmingRemove,
    askRemove: () => setConfirmingRemove(true),
    cancelRemove: () => setConfirmingRemove(false),
    removeChecked
  }
}
