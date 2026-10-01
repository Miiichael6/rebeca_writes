import type { Area, Point } from './edge'

/**
 * Dónde va la ventana del menú del dock: a un lado del cursor (`opensLeft`, de `menuOpensLeft`)
 * y hacia abajo; si no cabe, se arrima dentro del área de trabajo. El menú se dibuja pegado a la
 * esquina superior del lado del cursor, así que crecer (al abrir el submenú) ensancha la ventana
 * hacia fuera del cursor sin mover lo que ya se ve.
 */
export function menuBounds(
  cursor: Point,
  size: { width: number; height: number },
  area: Area,
  opensLeft: boolean
): Area {
  const width = Math.ceil(Math.min(size.width, area.width))
  const height = Math.ceil(Math.min(size.height, area.height))
  const wanted = opensLeft ? cursor.x - width : cursor.x
  const x = Math.max(area.x, Math.min(wanted, area.x + area.width - width))
  const y = Math.max(area.y, Math.min(cursor.y, area.y + area.height - height))
  return { x, y, width, height }
}
