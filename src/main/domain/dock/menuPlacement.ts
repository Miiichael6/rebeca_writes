import type { Area, Point } from './edge'

/**
 * Dónde va la ventana del menú del dock: a la izquierda del cursor (el dock está en el borde
 * derecho) y hacia abajo; si no cabe, se arrima dentro del área de trabajo. El menú se dibuja
 * pegado a la esquina superior derecha de la ventana, así que crecer (al abrir el submenú) la
 * ensancha hacia la izquierda sin mover lo que ya se ve.
 */
export function menuBounds(
  cursor: Point,
  size: { width: number; height: number },
  area: Area
): Area {
  const width = Math.ceil(Math.min(size.width, area.width))
  const height = Math.ceil(Math.min(size.height, area.height))
  const x = Math.max(area.x, cursor.x - width)
  const y = Math.max(area.y, Math.min(cursor.y, area.y + area.height - height))
  return { x, y, width, height }
}
