/**
 * Dónde está el dock: en el borde derecho del área de trabajo, escondido como una barra fina
 * (`PEEK_PX` de ancho, `BAR_PX` de alto) o fuera, junto al borde (el ancho de `dockWidth` más
 * `MARGIN_PX`, tan alto como la barra y pegado al borde, para que un ratón que estaba en la
 * barra siga dentro de la ventana; la píldora se dibuja en medio y el margen queda vacío). Los
 * dos centrados a la misma altura. Copiado de Rebecca Listen (tarea 49).
 */

/** Lo que asoma del dock escondido: lo justo para poner el ratón encima. */
export const PEEK_PX = 6

/** Largo de la barra escondida: media pulgada a escala 100 %. */
export const BAR_PX = 48

/** Hueco entre la píldora y el borde de la pantalla; es parte de la ventana. */
export const MARGIN_PX = 12

/** Altura del dock en el borde, como fracción del área de trabajo desde arriba. */
const HEIGHT_RATIO = 0.7

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

/** `pill`: el ancho del dock fuera (`dockWidth`), o `null` escondido. */
export function dockBounds(area: Area, pill: number | null): Area {
  const right = area.x + area.width
  const middle = area.y + area.height * HEIGHT_RATIO
  const width = pill === null ? PEEK_PX : pill + MARGIN_PX
  const height = BAR_PX
  return {
    x: right - width,
    y: Math.round(middle - height / 2),
    width,
    height
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

/** La x de cada fotograma del deslizamiento de `from` a `to`, frenando al final y acabando en `to`. */
export function slidePath(from: number, to: number, frames: number): number[] {
  return Array.from({ length: frames }, (_, index) => {
    const t = (index + 1) / frames
    const eased = 1 - (1 - t) ** 3
    return Math.round(from + (to - from) * eased)
  })
}
