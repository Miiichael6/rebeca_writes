import { useState } from 'react'
import { MOTION_FAST } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { Menu, type MenuItem } from './Menu'

/** Ancho del menú, para no abrirlo pegado al borde derecho de la ventana. */
const MENU_WIDTH = 272

export interface MenuPosition {
  x: number
  y: number
}

export interface ContextMenuProps {
  /** Punto donde se pidió el menú, o `null` si está cerrado. */
  at: MenuPosition | null
  onClose: () => void
  items: MenuItem[]
  /** Alto aproximado del menú, para que no se salga por abajo. */
  height: number
  'aria-label': string
}

/**
 * Menú contextual en el puntero: un ancla de tamaño cero con el `Menu` debajo. Conserva la última
 * posición y sus ítems mientras dura la animación de salida, porque para entonces `at` ya es
 * `null` y quien lo usa suele calcular los ítems a partir de él.
 */
export function ContextMenu({
  at,
  onClose,
  items,
  height,
  ...rest
}: ContextMenuProps): React.JSX.Element | null {
  // Lo último que se pidió, para seguir pintándolo mientras el menú se va.
  const [last, setLast] = useState<{ at: MenuPosition; items: MenuItem[] } | null>(null)
  if (at && at !== last?.at) setLast({ at, items })
  const { mounted } = useMountTransition(at !== null, MOTION_FAST)

  if (!mounted || !last) return null
  const position = at ?? last.at
  const shown = at ? items : last.items

  return (
    <div
      className="menu-anchor segment-menu"
      style={{
        left: Math.min(position.x, window.innerWidth - MENU_WIDTH),
        top: Math.min(position.y, window.innerHeight - height)
      }}
    >
      <Menu open={at !== null} onClose={onClose} items={shown} aria-label={rest['aria-label']} />
    </div>
  )
}
