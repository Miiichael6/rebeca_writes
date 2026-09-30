import { useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditHandlers } from '../application/useSegmentEditing'

/**
 * Campo de edición de un segmento: se ajusta a la altura del texto. Enter guarda,
 * Shift+Enter hace salto de línea, Esc cancela y al perder el foco guarda.
 */
export function SegmentEditor({
  draft,
  edit
}: {
  draft: string
  edit: EditHandlers
}): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Los eventos no suben a la fila: su clic salta en el video y su Enter también.
  const stop = (e: React.SyntheticEvent): void => e.stopPropagation()
  return (
    <textarea
      ref={ref}
      className="segment-editor"
      rows={1}
      value={draft}
      aria-label={t('transcript.editLabel')}
      onChange={(e) => edit.change(e.target.value)}
      onBlur={() => edit.commit(false)}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      onKeyDown={(e) => {
        // Tampoco llegan a los atajos globales (Espacio, flechas, Ctrl+C...).
        e.stopPropagation()
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          edit.commit(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          edit.cancel()
        }
      }}
    />
  )
}
