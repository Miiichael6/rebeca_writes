import { dockShowsIndicator, type DockView } from '@shared/dock'

/**
 * Lo largo que es el dock fuera según lo que muestra (tarea 30): un botón por extremo con algo
 * y, entre ellos, la onda o la pregunta. Sin hueco para el botón que no está. Las medidas son
 * las de la píldora en `components.css`; la píldora llena el ancho que le da la ventana.
 */

/** Botón redondo de un extremo. */
const BUTTON_PX = 20
/** Separación entre los elementos de la píldora. */
const GAP_PX = 5
/** Centro con la onda: sus 9 barras y un poco de aire. */
const WAVE_PX = 40
/** Centro con la pregunta corta (cabe "¿Terminar?"). */
const QUESTION_PX = 60
/** Relleno y borde de la píldora a cada lado (3 + 1,5), más el relleno del dock (2). */
const EDGE_PX = 6.5

function buttonCount(view: DockView): number {
  const right = view.right !== null || dockShowsIndicator(view)
  return Number(view.left !== null) + Number(right)
}

export function dockWidth(view: DockView): number {
  const buttons = buttonCount(view)
  const center = view.question ? QUESTION_PX : WAVE_PX
  return Math.ceil(2 * EDGE_PX + buttons * (BUTTON_PX + GAP_PX) + center)
}
