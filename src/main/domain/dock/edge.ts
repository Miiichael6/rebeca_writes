import { dockAlign, dockEdge, type DockAlign, type DockPosition } from '@shared/dock'

/**
 * Dónde está el dock (tareas 30, 33 y 34): arriba o abajo de la pantalla, escondido como una barra
 * horizontal fina (`BAR_PX` de largo y `PEEK_PX` de grosor) o fuera, con la píldora tumbada a lo
 * largo del borde. La barra va en una esquina (a `CORNER_GAP_PX`) o al centro, y la píldora sale
 * centrada sobre ella. Fuera, la ventana mide el ancho de `dockWidth` y `BAR_PX` de alto: la barra
 * queda dentro, para que un ratón que estaba en la barra siga dentro. La píldora se dibuja en la
 * ventana y el margen hacia el borde queda vacío (CSS).
 */

/** Lo que asoma del dock escondido: lo justo para poner el ratón encima. */
export const PEEK_PX = 6

/** Largo de la barra escondida: media pulgada a escala 100 %. */
export const BAR_PX = 48

/**
 * Distancia a la esquina en las posiciones de esquina: deja libres los botones de minimizar,
 * maximizar y cerrar de una ventana maximizada (3 × 46 px), que el dock siempre encima taparía.
 */
export const CORNER_GAP_PX = 160

export interface Area {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** Dónde empieza la barra a lo ancho del área según `align`, a `CORNER_GAP_PX` si va en una esquina. */
function barStart(area: Area, align: DockAlign): number {
  if (align === 'start') return area.x + CORNER_GAP_PX
  if (align === 'end') return area.x + area.width - CORNER_GAP_PX - BAR_PX
  return Math.round(area.x + (area.width - BAR_PX) / 2)
}

/** `pill`: el ancho del dock fuera (`dockWidth`), o `null` escondido. */
export function dockBounds(area: Area, pill: number | null, position: DockPosition): Area {
  const width = pill === null ? BAR_PX : pill
  const height = pill === null ? PEEK_PX : BAR_PX
  return {
    // La píldora se centra sobre la barra, no sale a un lado de ella.
    x: Math.round(barStart(area, dockAlign(position)) + (BAR_PX - width) / 2),
    y: dockEdge(position) === 'top' ? area.y : area.y + area.height - height,
    width,
    height
  }
}

/**
 * El dock fuera (`pill` de ancho) metido tras su borde salvo `PEEK_PX`: donde empieza y acaba
 * el deslizamiento, que así entra o sale desde la barra.
 */
export function tuckedBounds(area: Area, pill: number, position: DockPosition): Area {
  const out = dockBounds(area, pill, position)
  return dockEdge(position) === 'top'
    ? { ...out, y: area.y + PEEK_PX - out.height }
    : { ...out, y: area.y + area.height - PEEK_PX }
}

export function contains(area: Area, point: Point): boolean {
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  )
}
