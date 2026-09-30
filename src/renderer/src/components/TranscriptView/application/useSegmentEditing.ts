import { useMemo, useRef, useState } from 'react'
import { committedText, type EditDraft } from '../domain/editing'
import { usePorts } from './ports'

/** Acciones de la edición en línea. Estables entre renders para no romper el `memo` de las filas. */
export interface EditHandlers {
  start: (index: number) => void
  change: (text: string) => void
  /** `refocus`: devolver el foco a la lista (Enter); no al salir con un clic fuera. */
  commit: (refocus: boolean) => void
  cancel: () => void
}

interface Options {
  /** Contenedor de la lista, al que vuelve el foco al terminar de editar. */
  scrollRef: React.RefObject<HTMLElement | null>
  /** Se llama al empezar a editar (para que el autoscroll no se lleve la vista). Estable. */
  onStart: () => void
  /** Aviso ya traducido para cuando no se puede editar (el archivo se está transcribiendo). */
  lockedMessage: string
}

/**
 * Edición en línea (tarea 16). El borrador vive aquí y no en la fila: la fila puede salir
 * del DOM al desplazar (virtualización) sin perder lo escrito.
 */
export function useSegmentEditing({ scrollRef, onStart, lockedMessage }: Options): {
  edit: EditHandlers
  /** El segmento en edición, o `null`. Es `null` también si el archivo deja de ser editable. */
  activeEdit: EditDraft | null
  editable: boolean
} {
  const { transcript, notifier } = usePorts()
  const editable = transcript.useCanEdit()
  const [editing, setEditing] = useState<EditDraft | null>(null)
  // Copia síncrona: Enter y el `blur` que le sigue no deben guardar dos veces.
  const editingRef = useRef(editing)

  const edit = useMemo<EditHandlers>(() => {
    const set = (next: EditDraft | null): void => {
      editingRef.current = next
      setEditing(next)
    }
    return {
      start: (index) => {
        const segment = transcript.getSegment(index)
        if (!segment) return
        if (!transcript.canEditNow()) {
          notifier.notify(lockedMessage)
          return
        }
        onStart()
        set({ index, draft: segment.text })
      },
      change: (text) => {
        if (editingRef.current) set({ ...editingRef.current, draft: text })
      },
      commit: (refocus) => {
        const current = editingRef.current
        if (!current) return
        set(null)
        const text = committedText(current.draft)
        if (text !== null) transcript.editSegment(current.index, text)
        if (refocus) scrollRef.current?.focus({ preventScroll: true })
      },
      cancel: () => {
        if (!editingRef.current) return
        set(null)
        scrollRef.current?.focus({ preventScroll: true })
      }
    }
  }, [transcript, notifier, scrollRef, onStart, lockedMessage])

  // Si ese archivo empieza a transcribirse, el campo desaparece (no se puede editar).
  return { edit, activeEdit: editable ? editing : null, editable }
}
