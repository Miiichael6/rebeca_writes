import type { RecordingSource } from './recording'

/**
 * El dock en el borde de la pantalla (tarea 30): una píldora escondida en un borde (tarea 33) que
 * sale con el ratón, graba y hace preguntas de sí/no. Sin imports de `electron`: lo usa el
 * renderer.
 */

/** Pregunta en la píldora; el texto lo traduce el renderer. */
export type DockQuestion = 'end' | 'quit' | 'quitRecording' | 'meeting'

/** Lo que hace un botón de la píldora. */
export type DockAction =
  | 'record'
  | 'askEnd'
  | 'stopAndSave'
  | 'keepRecording'
  | 'quit'
  | 'stay'
  | 'recordMeeting'
  | 'dismissMeeting'

export const DOCK_BUTTONS = ['left', 'right'] as const
export type DockButton = (typeof DOCK_BUTTONS)[number]

export interface DockView {
  /** Fuera, en la pantalla; si no, solo asoma la barra del borde. */
  out: boolean
  recording: boolean
  /** En el centro en vez de la onda; `null` sin pregunta. */
  question: DockQuestion | null
  /** `null`: sin botón. */
  left: DockAction | null
  /** `null` mientras graba sin pregunta: el 🎤 queda de indicador, sin acción. */
  right: DockAction | null
}

/** Grabando sin pregunta, el extremo derecho muestra el 🎤 de indicador, sin acción. */
export function dockShowsIndicator(view: DockView): boolean {
  return view.right === null && view.recording
}

/**
 * Dónde vive el dock (tarea 33): en cada borde de la pantalla, en un extremo o al centro. Arriba
 * y abajo el extremo es izquierda o derecha; en los laterales, arriba o abajo.
 */
export const DOCK_POSITIONS = [
  'topLeft',
  'topCenter',
  'topRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'leftTop',
  'leftCenter',
  'leftBottom',
  'rightTop',
  'rightCenter',
  'rightBottom'
] as const
export type DockPosition = (typeof DOCK_POSITIONS)[number]
export const DEFAULT_DOCK_POSITION: DockPosition = 'rightCenter'

/** El borde de la pantalla en el que asoma el dock escondido. */
export type DockEdge = 'left' | 'right' | 'top' | 'bottom'
/** Dónde va a lo largo de su borde: al principio (izquierda o arriba), al centro o al final. */
export type DockAlign = 'start' | 'center' | 'end'

const PLACEMENTS: Record<DockPosition, { edge: DockEdge; align: DockAlign }> = {
  topLeft: { edge: 'top', align: 'start' },
  topCenter: { edge: 'top', align: 'center' },
  topRight: { edge: 'top', align: 'end' },
  bottomLeft: { edge: 'bottom', align: 'start' },
  bottomCenter: { edge: 'bottom', align: 'center' },
  bottomRight: { edge: 'bottom', align: 'end' },
  leftTop: { edge: 'left', align: 'start' },
  leftCenter: { edge: 'left', align: 'center' },
  leftBottom: { edge: 'left', align: 'end' },
  rightTop: { edge: 'right', align: 'start' },
  rightCenter: { edge: 'right', align: 'center' },
  rightBottom: { edge: 'right', align: 'end' }
}

export function dockEdge(position: DockPosition): DockEdge {
  return PLACEMENTS[position].edge
}

export function dockAlign(position: DockPosition): DockAlign {
  return PLACEMENTS[position].align
}

/**
 * Si el menú del dock se abre a la izquierda del cursor (hacia dentro de la pantalla): sí con el
 * dock en el borde derecho, no en el izquierdo, y arriba o abajo según esté en la mitad
 * izquierda (no) o en el centro o la derecha (sí).
 */
export function menuOpensLeft(position: DockPosition): boolean {
  switch (dockEdge(position)) {
    case 'right':
      return true
    case 'left':
      return false
    case 'top':
    case 'bottom':
      return dockAlign(position) !== 'start'
  }
}

/**
 * Lo que tarda la píldora en contraerse como una gota antes de deslizarse al borde (tarea 34):
 * el micrófono se come la onda. El renderer anima la contracción (`--dock-contract-ms`) y el
 * main espera ese rato antes de mover la ventana.
 */
export const DOCK_CONTRACT_MS = 320

/** Lo que la gota (solo el 🎤) se queda quieta, ya contraída, antes de meterse en el borde. */
export const DOCK_DROP_HOLD_MS = 500

/** Lo elegido en el menú contextual del dock. */
export type DockMenuAction =
  | { kind: 'open' }
  /** `name` es el de la entrada, ya traducido. */
  | { kind: 'record'; source: RecordingSource; name: string }
  | { kind: 'stop' }
  | { kind: 'quit' }
  /** Esc, clic fuera o tras elegir: el menú se esconde. */
  | { kind: 'close' }

/** Lo que ocupa el menú en su ventana, en px CSS. */
export interface DockMenuSize {
  width: number
  height: number
}
