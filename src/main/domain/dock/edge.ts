import { dockAlign, dockEdge, type DockAlign, type DockPosition } from '@shared/dock'

/**
 * Dónde está el dock (tareas 30 y 33): en el borde que dice su posición, escondido como una
 * barra fina (`PEEK_PX` de grosor y `BAR_PX` de largo) o fuera, junto al borde. La barra queda
 * dentro de la ventana fuera, para que un ratón que estaba en la barra siga dentro. La píldora
 * se dibuja en la ventana y el margen hacia el borde queda vacío.
 *
 * - En un borde lateral la píldora sale hacia dentro: la ventana mide el ancho de `dockWidth`
 *   más `MARGIN_PX` y es tan alta como la barra, a `SIDE_GAP_PX` del extremo o al centro. Copiado
 *   de Rebecca Listen (tarea 49).
 * - Arriba o abajo la píldora va tumbada a lo largo del borde: la ventana mide el ancho de
 *   `dockWidth` y `BAR_PX` de alto, y la barra escondida es horizontal, en una esquina (a
 *   `CORNER_GAP_PX`) o al centro.
 */

/** Lo que asoma del dock escondido: lo justo para poner el ratón encima. */
export const PEEK_PX = 6

/** Largo de la barra escondida: media pulgada a escala 100 %. */
export const BAR_PX = 48

/** Hueco entre la píldora y el borde de la pantalla; es parte de la ventana. */
export const MARGIN_PX = 12

/**
 * Distancia a la esquina en las posiciones de esquina: deja libres los botones de minimizar,
 * maximizar y cerrar de una ventana maximizada (3 × 46 px), que el dock siempre encima taparía.
 */
export const CORNER_GAP_PX = 160

/** Distancia a la esquina en los bordes laterales: ahí no hay botones de ventana que evitar. */
export const SIDE_GAP_PX = 100

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

/**
 * Dónde empieza algo de largo `length` en un tramo `[start, start + span)` según `align`, a
 * `gap` del extremo si va en uno.
 */
function alignedStart(
  start: number,
  span: number,
  length: number,
  align: DockAlign,
  gap: number
): number {
  if (align === 'start') return start + gap
  if (align === 'end') return start + span - gap - length
  return Math.round(start + (span - length) / 2)
}

/** Borde izquierdo o derecho: barra vertical; fuera, la píldora asoma hacia dentro. */
function sideBounds(
  area: Area,
  pill: number | null,
  edge: 'left' | 'right',
  align: DockAlign
): Area {
  const width = pill === null ? PEEK_PX : pill + MARGIN_PX
  const height = BAR_PX
  return {
    x: edge === 'left' ? area.x : area.x + area.width - width,
    y: alignedStart(area.y, area.height, height, align, SIDE_GAP_PX),
    width,
    height
  }
}

/** Borde de arriba o de abajo: barra horizontal; fuera, la píldora tumbada a lo largo. */
function topOrBottomBounds(
  area: Area,
  pill: number | null,
  edge: 'top' | 'bottom',
  align: DockAlign
): Area {
  const width = pill === null ? BAR_PX : pill
  const height = pill === null ? PEEK_PX : BAR_PX
  return {
    x: alignedStart(area.x, area.width, width, align, CORNER_GAP_PX),
    y: edge === 'top' ? area.y : area.y + area.height - height,
    width,
    height
  }
}

/** `pill`: el ancho del dock fuera (`dockWidth`), o `null` escondido. */
export function dockBounds(area: Area, pill: number | null, position: DockPosition): Area {
  const edge = dockEdge(position)
  switch (edge) {
    case 'left':
    case 'right':
      return sideBounds(area, pill, edge, dockAlign(position))
    case 'top':
    case 'bottom':
      return topOrBottomBounds(area, pill, edge, dockAlign(position))
  }
}

/**
 * El dock fuera (`pill` de ancho) metido tras su borde salvo `PEEK_PX`: donde empieza y acaba
 * el deslizamiento, que así entra o sale desde la barra.
 */
export function tuckedBounds(area: Area, pill: number, position: DockPosition): Area {
  const out = dockBounds(area, pill, position)
  switch (dockEdge(position)) {
    case 'right':
      return { ...out, x: area.x + area.width - PEEK_PX }
    case 'left':
      return { ...out, x: area.x + PEEK_PX - out.width }
    case 'top':
      return { ...out, y: area.y + PEEK_PX - out.height }
    case 'bottom':
      return { ...out, y: area.y + area.height - PEEK_PX }
  }
}

export function contains(area: Area, point: Point): boolean {
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  )
}
