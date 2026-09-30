import { useCallback, useState } from 'react'

export interface SegmentMenuState {
  index: number
  x: number
  y: number
}

/** Menú contextual de un segmento: se abre con clic derecho sobre uno, si se puede editar. */
export function useSegmentMenu(editable: boolean): {
  menu: SegmentMenuState | null
  close: () => void
  onContextMenu: (e: React.MouseEvent) => void
} {
  const [menu, setMenu] = useState<SegmentMenuState | null>(null)
  const close = useCallback(() => setMenu(null), [])

  const onContextMenu = (e: React.MouseEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-seg]')
    if (!el || !editable) return
    e.preventDefault()
    setMenu({ index: Number(el.dataset.seg), x: e.clientX, y: e.clientY })
  }

  return { menu, close, onContextMenu }
}
